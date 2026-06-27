/* ============================================================================
   Sobriety Guardian — hybrid alcohol-sensing firmware (Recoverly project)
   ----------------------------------------------------------------------------
   Board   : Arduino Nano ESP32 (ESP32-S3)
   Sensors :
     * DFRobot SEN0376 electrochemical alcohol sensor (I2C 0x75, 0-5 ppm)
         -> precise LOW-range / presence / ambient detection
     * MQ-3 semiconductor alcohol sensor (analog)
         -> extended range for BAC ESTIMATION when SEN0376 saturates (>~5 ppm)
   Display : SSD1306 128x64 OLED (I2C 0x3C)
   Output  : piezo buzzer + LED
   Uplink  : HTTPS POST to /api/device-ingest using a per-device TOKEN
             (no Firebase account password lives on the device)

   MODES (set DEVICE_MODE below):
     MODE_PERSONAL : ambient watch + blow-to-check (personal Sobriety Guardian)
     MODE_CAMPUS   : continuous ambient monitor ("alcohol-free zone" for NGOs)
     MODE_BREATH   : blow-to-check breathalyser (SEN0376 -> MQ-3 BAC path)

   ⚠ HONESTY / SAFETY:
     SEN0376 reports PRESENCE only (0-5 ppm; ~0.002% BAC ceiling) — never a BAC.
     The MQ-3 is NOT factory-calibrated; its BAC is an ESTIMATE that drifts with
     temperature/humidity/age. It must be calibrated (R0 + CALFACTOR) against a
     real breathalyser and is NOT for legal, driving, or medical decisions.

   Libraries (Arduino Library Manager): WiFiManager, DFRobot_Alcohol,
     Adafruit_SSD1306, Adafruit_GFX.
   Wiring + calibration: see WIRING.md next to this file.
   ============================================================================ */

#include <WiFi.h>
#include <WiFiManager.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <math.h>
#include "DFRobot_Alcohol.h"
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

// ======================= DEVICE IDENTITY (FILL THESE IN) =====================
// Get these once from the app: POST /api/device/register -> { deviceId, token }.
#define DEVICE_ID    "PASTE_DEVICE_ID_HERE"
#define DEVICE_TOKEN "PASTE_DEVICE_TOKEN_HERE"
#define INGEST_URL   "https://recoverly-app.vercel.app/api/device-ingest"

// ============================== MODE =========================================
#define MODE_PERSONAL 0
#define MODE_CAMPUS   1
#define MODE_BREATH   2
#define DEVICE_MODE   MODE_PERSONAL   // <- change per deployment

// ============================== PINS =========================================
// I2C (SEN0376 + OLED) uses the default Nano ESP32 Wire bus: A4=SDA, A5=SCL.
#define MQ3_PIN     A0            // MQ-3 analog out — THROUGH a divider (see WIRING.md), must stay <= 3.3V
#define BUZZER_PIN  D9
#define LED_PIN     LED_BUILTIN

// ============================== OLED =========================================
#define OLED_W 128
#define OLED_H 64
#define OLED_ADDR 0x3C
Adafruit_SSD1306 oled(OLED_W, OLED_H, &Wire, -1);
bool oledOk = false;

// ============================== SEN0376 ======================================
DFRobot_Alcohol_I2C alcohol(&Wire, ALCOHOL_ADDRESS_3);   // 0x75
#define SEN_COLLECT 5
float senBaseline = 0.0;                                  // clean-air offset
const float SEN_PRESENCE_PPM = 0.15;                      // above baseline => alcohol present
const float SEN_SATURATE_PPM = 4.50;                      // near 5 ppm ceiling => quantify with MQ-3

// ===================== Breath-alcohol science (documented) ===================
// ppm(breath) -> BrAC(mg/L) -> BAC(%). Blood:breath partition 2100:1,
// ethanol MW 46.07 g/mol, breath temp ~34 C.
//   BrAC(mg/L) = ppm * 0.001828
//   BAC(%)     = BrAC(mg/L) * 0.2105
// Cross-check: BAC 0.08% <-> 0.38 mg/L <-> ~200 ppm. (That is why a 0-5 ppm
// sensor cannot measure intoxication and the MQ-3 takes over above ~5 ppm.)
const float PPM_TO_MGL = 0.001828;
const float MGL_TO_BAC = 0.2105;

// ===================== MQ-3 calibration (TUNE THESE!) ========================
// Rs = RL * (VC - Vout) / Vout ;  ratio = Rs/R0 ;  BrAC(mg/L) = A * ratio^B
const float ADC_VREF      = 3.3;       // ESP32-S3 ADC full scale
const int   ADC_MAX       = 4095;      // 12-bit
const float MQ3_DIVIDER   = 2.0;       // external resistor divider on AO (e.g. two equal R) — see WIRING.md
const float MQ3_VC        = 5.0;       // MQ-3 module supply voltage
const float MQ3_RL        = 10000.0;   // load resistor on your MQ-3 module (ohms)
const float MQ3_A         = 0.4;       // datasheet alcohol-curve coefficient  (STARTING POINT)
const float MQ3_B         = -1.43;     // datasheet alcohol-curve exponent     (STARTING POINT)
const float MQ3_RO_CLEAN  = 60.0;      // Rs/R0 ratio in clean air for MQ-3 (datasheet ~60)
const float MQ3_CALFACTOR = 1.0;       // final multiplier to match a reference breathalyser
float mq3R0 = 10000.0;                 // set during clean-air calibration

// ============================== STATE ========================================
enum Level { LVL_CLEAR, LVL_PRESENT, LVL_BAC };
uint32_t lastPostMs = 0;
const uint32_t POST_MIN_INTERVAL_MS = 4000;   // don't spam the server
Level lastPosted = LVL_CLEAR;

// ============================================================================
void buzz(int times) {
  for (int i = 0; i < times; i++) {
    digitalWrite(BUZZER_PIN, HIGH); delay(120);
    digitalWrite(BUZZER_PIN, LOW);  delay(120);
  }
}

void showOLED(const String& l1, const String& l2, const String& l3) {
  if (!oledOk) return;
  oled.clearDisplay();
  oled.setTextColor(SSD1306_WHITE);
  oled.setTextSize(1); oled.setCursor(0, 0);  oled.println(l1);
  oled.setTextSize(2); oled.setCursor(0, 18); oled.println(l2);
  oled.setTextSize(1); oled.setCursor(0, 50); oled.println(l3);
  oled.display();
}

// ============================== SEN0376 ======================================
float readSenPpm() {
  float v = alcohol.readAlcoholData(SEN_COLLECT);
  if (isnan(v) || v < 0) return 0;
  return v;
}

// =============================== MQ-3 ========================================
float readMq3Rs() {
  long acc = 0;
  for (int i = 0; i < 16; i++) { acc += analogRead(MQ3_PIN); delay(5); }
  float vadc = (acc / 16.0 / ADC_MAX) * ADC_VREF;
  float vout = vadc * MQ3_DIVIDER;                 // true AO voltage before the divider
  if (vout < 0.05) vout = 0.05;
  if (vout > MQ3_VC - 0.05) vout = MQ3_VC - 0.05;
  return MQ3_RL * (MQ3_VC - vout) / vout;
}

// Returns ESTIMATED BrAC in mg/L from the MQ-3.
float readMq3BrACmgL() {
  float ratio = readMq3Rs() / mq3R0;
  if (ratio < 0.01) ratio = 0.01;
  float mgL = MQ3_A * pow(ratio, MQ3_B);
  if (mgL < 0) mgL = 0;
  return mgL;
}

// ============================== CALIBRATION ==================================
void calibrate() {
  showOLED("Calibrating...", "clean air", "do not blow");
  delay(2500);

  // SEN0376 clean-air baseline
  float s = 0;
  for (int i = 0; i < 20; i++) { s += readSenPpm(); delay(120); }
  senBaseline = s / 20.0;

  // MQ-3 R0 from clean-air Rs (R0 = Rs_clean / clean-air ratio)
  float rs = 0;
  for (int i = 0; i < 20; i++) { rs += readMq3Rs(); delay(60); }
  mq3R0 = (rs / 20.0) / MQ3_RO_CLEAN;

  Serial.print("SEN baseline ppm: "); Serial.println(senBaseline, 3);
  Serial.print("MQ-3 R0 (ohms):   "); Serial.println(mq3R0, 1);
}

// ============================== UPLINK =======================================
bool postSignal(const char* source, const char* result, float ppm,
                bool hasBac, float bac, float brac) {
  if (WiFi.status() != WL_CONNECTED) return false;

  WiFiClientSecure client;
  client.setInsecure();              // prototype: skip cert validation (see WIRING.md note)
  HTTPClient https;
  if (!https.begin(client, INGEST_URL)) return false;

  https.addHeader("Content-Type", "application/json");
  https.addHeader("x-device-id", DEVICE_ID);
  https.addHeader("Authorization", String("Bearer ") + DEVICE_TOKEN);

  String body = String("{\"source\":\"") + source + "\",\"result\":\"" + result + "\"";
  if (ppm >= 0)  body += ",\"ppm\":" + String(ppm, 3);
  if (hasBac)    body += ",\"bac\":" + String(bac, 4) + ",\"brac\":" + String(brac, 3);
  body += "}";

  int code = https.POST(body);
  https.end();
  Serial.print("POST "); Serial.print(source); Serial.print(" -> "); Serial.println(code);
  return code >= 200 && code < 300;
}

// Rate-limited post: only on level change, or after POST_MIN_INTERVAL_MS.
void maybePost(Level lvl, const char* source, const char* result, float ppm,
               bool hasBac, float bac, float brac) {
  uint32_t now = millis();
  if (lvl == lastPosted && (now - lastPostMs) < POST_MIN_INTERVAL_MS) return;
  if (postSignal(source, result, ppm, hasBac, bac, brac)) {
    lastPosted = lvl; lastPostMs = now;
  }
}

// ============================== SENSE CYCLE ==================================
// One unified pass; the mode only changes framing + alert aggressiveness.
void senseOnce() {
  float ppm = readSenPpm() - senBaseline;
  if (ppm < 0) ppm = 0;

  const char* presenceSource =
      (DEVICE_MODE == MODE_CAMPUS) ? "guardian_ambient" :
      (DEVICE_MODE == MODE_BREATH) ? "guardian_breath"  : "guardian_ambient";

  if (ppm >= SEN_SATURATE_PPM) {
    // --- SEN0376 saturated: real alcohol present -> quantify with MQ-3 ---
    digitalWrite(LED_PIN, HIGH);
    float brac = readMq3BrACmgL();
    float bac  = brac * MGL_TO_BAC * MQ3_CALFACTOR;

    char l2[20]; snprintf(l2, sizeof(l2), "%.3f%%", bac);
    showOLED("Breath alcohol (EST)", String(l2), "MQ-3 estimate only");
    Serial.printf("MQ-3 est BrAC=%.3f mg/L  BAC=%.3f%%\n", brac, bac);

    buzz(bac >= 0.08 ? 3 : bac >= 0.03 ? 2 : 1);
    maybePost(LVL_BAC, "breathalyser_mq3", "detected", ppm, true, bac, brac);

  } else if (ppm >= SEN_PRESENCE_PPM) {
    // --- trace alcohol present (within SEN0376's honest range): presence only ---
    digitalWrite(LED_PIN, HIGH);
    char l3[24]; snprintf(l3, sizeof(l3), "%.2f ppm (trace)", ppm);
    showOLED("Alcohol DETECTED", "! ! !", String(l3));
    if (DEVICE_MODE == MODE_CAMPUS) buzz(2);
    maybePost(LVL_PRESENT, presenceSource, "detected", ppm, false, 0, 0);

  } else {
    // --- clean ---
    digitalWrite(LED_PIN, LOW);
    showOLED(DEVICE_MODE == MODE_CAMPUS ? "Zone monitor" : "Sobriety Guardian",
             "All clear", "no alcohol");
    maybePost(LVL_CLEAR, presenceSource, "clear", ppm, false, 0, 0);
  }
}

// ============================================================================
void setup() {
  Serial.begin(115200);
  pinMode(BUZZER_PIN, OUTPUT); digitalWrite(BUZZER_PIN, LOW);
  pinMode(LED_PIN, OUTPUT);    digitalWrite(LED_PIN, LOW);
  analogReadResolution(12);

  Wire.begin();

  oledOk = oled.begin(SSD1306_SWITCHCAPVCC, OLED_ADDR);
  showOLED("Sobriety Guardian", "Booting", "");

  // SEN0376
  while (!alcohol.begin()) { Serial.println("SEN0376 not found"); showOLED("SEN0376", "not found", "check wiring"); delay(1000); }
  alcohol.setModes(MEASURE_MODE_AUTOMATIC);

  // WiFi (captive portal "Guardian_Setup" on first run / unknown network)
  showOLED("WiFi setup", "Guardian_Setup", "join to configure");
  WiFiManager wm;
  wm.setConfigPortalTimeout(180);
  wm.autoConnect("Guardian_Setup");

  // MQ-3 needs heater warm-up; give it a moment before calibration.
  showOLED("MQ-3 warm-up", "~20 s", "");
  delay(20000);

  calibrate();
  buzz(1);
  Serial.println("READY");
}

void loop() {
  senseOnce();
  delay(DEVICE_MODE == MODE_CAMPUS ? 1500 : 400);
}
