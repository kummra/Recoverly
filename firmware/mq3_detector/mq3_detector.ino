/* ============================================================================
   MQ-3 Alcohol Detector — Recoverly (simple build)
   ----------------------------------------------------------------------------
   Board  : Arduino Nano ESP32 (ESP32-S3)
   Sensor : MQ-3 semiconductor alcohol sensor (analog)
   Extras : SSD1306 128x64 OLED (optional), piezo buzzer, on-board LED

   WHAT THIS IS: an alcohol *detector*. It reports whether alcohol vapour is
   present and how strong it is RELATIVE to clean air (clear / trace / detected
   / strong). That is a genuinely reliable thing for an uncalibrated MQ-3 to do.

   WHAT THIS IS NOT: a breathalyser. It does NOT output BAC. An MQ-3 that has
   not been calibrated against a real breathalyser cannot give a trustworthy
   blood-alcohol number, and a wrong number is worse than no number. Estimated
   ppm is printed to Serial ONLY, clearly marked as rough, for tuning.

   Start here: set USE_OLED / USE_WIFI below, wire per WIRING.md, flash, then
   watch the Serial Monitor at 115200 while you calibrate.
   ============================================================================ */

#define USE_OLED 1     // 1 = show status on the SSD1306 OLED, 0 = skip it
#define USE_WIFI 0     // 0 = standalone. 1 = also stream events to the app.

#include <Wire.h>
#include <math.h>

#if USE_OLED
  #include <Adafruit_GFX.h>
  #include <Adafruit_SSD1306.h>
  #define OLED_ADDR 0x3C
  Adafruit_SSD1306 oled(128, 64, &Wire, -1);
  bool oledOk = false;
#endif

#if USE_WIFI
  #include <WiFi.h>
  #include <WiFiManager.h>
  #include <WiFiClientSecure.h>
  #include <HTTPClient.h>
  // Provision these once from the app: POST /api/device/register
  #define DEVICE_ID    "PASTE_DEVICE_ID_HERE"
  #define DEVICE_TOKEN "PASTE_DEVICE_TOKEN_HERE"
  #define INGEST_URL   "https://recoverly-app.vercel.app/api/device-ingest"
#endif

// ============================== PINS =========================================
#define MQ3_PIN     A0            // via a 2:1 divider — MQ-3 AO is 5V, ADC is 3.3V max!
#define BUZZER_PIN  D9
#define LED_PIN     LED_BUILTIN

// ============================== SENSOR TUNING ================================
// Electrical
const float ADC_VREF    = 3.3;    // ESP32-S3 ADC full scale
const int   ADC_MAX     = 4095;   // 12-bit
const float MQ3_DIVIDER = 2.0;    // (R1+R2)/R2 of your divider — 2.0 for two equal resistors
const float MQ3_VC      = 5.0;    // MQ-3 module supply
const float MQ3_RL      = 10000.0;// load resistor on the module (ohms)

// Detection thresholds, as a fraction of the clean-air baseline (Rs/R0).
// Alcohol makes Rs FALL, so a LOWER ratio means MORE alcohol.
// Tune these using the Serial output (see WIRING.md "Tuning").
const float RATIO_TRACE    = 0.90;  // below this: something is there
const float RATIO_DETECTED = 0.60;  // below this: clearly alcohol
const float RATIO_STRONG   = 0.35;  // below this: strong source

// Timing
const uint32_t WARMUP_MS      = 20000;  // heater warm-up before calibration
const uint32_t SAMPLE_MS      = 500;    // how often we read
const uint32_t REPORT_MIN_MS  = 5000;   // min gap between uploads / level re-alerts

// ============================== STATE ========================================
float r0 = 10000.0;                 // clean-air resistance, set at calibration
enum Level { CLEAR = 0, TRACE = 1, DETECTED = 2, STRONG = 3 };
Level lastLevel = CLEAR;
uint32_t lastReportMs = 0;

const char* levelName(Level l) {
  switch (l) {
    case STRONG:   return "STRONG";
    case DETECTED: return "DETECTED";
    case TRACE:    return "trace";
    default:       return "clear";
  }
}

// ============================================================================
void buzz(int times, int ms = 120) {
  for (int i = 0; i < times; i++) {
    digitalWrite(BUZZER_PIN, HIGH); delay(ms);
    digitalWrite(BUZZER_PIN, LOW);  delay(ms);
  }
}

void showOLED(const char* line1, const char* big, const char* line3) {
#if USE_OLED
  if (!oledOk) return;
  oled.clearDisplay();
  oled.setTextColor(SSD1306_WHITE);
  oled.setTextSize(1); oled.setCursor(0, 0);  oled.println(line1);
  oled.setTextSize(2); oled.setCursor(0, 20); oled.println(big);
  oled.setTextSize(1); oled.setCursor(0, 52); oled.println(line3);
  oled.display();
#else
  (void)line1; (void)big; (void)line3;
#endif
}

// ---- Sensor reads ----------------------------------------------------------
// Median-of-N smoothing: rejects the occasional spurious ADC spike far better
// than a plain average.
float readRs() {
  const int N = 15;
  float v[N];
  for (int i = 0; i < N; i++) { v[i] = analogRead(MQ3_PIN); delay(4); }
  for (int i = 1; i < N; i++) {           // insertion sort
    float k = v[i]; int j = i - 1;
    while (j >= 0 && v[j] > k) { v[j + 1] = v[j]; j--; }
    v[j + 1] = k;
  }
  float adc = v[N / 2];

  float vadc = (adc / ADC_MAX) * ADC_VREF;
  float vout = vadc * MQ3_DIVIDER;         // actual AO voltage before the divider
  vout = constrain(vout, 0.05f, MQ3_VC - 0.05f);
  return MQ3_RL * (MQ3_VC - vout) / vout;
}

// Rough ppm estimate from the datasheet curve. SERIAL/TUNING ONLY — do not
// show this to a user as if it were a measurement.
float roughPpm(float ratio) {
  if (ratio <= 0.01) ratio = 0.01;
  return 0.4 * pow(ratio, -1.43) * 1000.0 / 46.07 * 24.45;  // mg/L -> ppm, very approximate
}

Level classify(float ratio) {
  if (ratio < RATIO_STRONG)   return STRONG;
  if (ratio < RATIO_DETECTED) return DETECTED;
  if (ratio < RATIO_TRACE)    return TRACE;
  return CLEAR;
}

// ---- Calibration -----------------------------------------------------------
void calibrate() {
  Serial.println(F("\n[calibrate] Keep the sensor in CLEAN AIR. Do not blow."));
  showOLED("Calibrating", "clean air", "do not blow");
  float sum = 0;
  const int N = 30;
  for (int i = 0; i < N; i++) { sum += readRs(); delay(150); }
  r0 = sum / N;
  Serial.print(F("[calibrate] R0 = ")); Serial.print(r0, 0); Serial.println(F(" ohms"));
  Serial.println(F("[calibrate] Done. Ratio should now sit near 1.00 in clean air.\n"));
  showOLED("Ready", "All clear", "");
  buzz(1);
}

// ---- Optional uplink -------------------------------------------------------
#if USE_WIFI
void postEvent(Level lvl, float ratio) {
  if (WiFi.status() != WL_CONNECTED) return;
  WiFiClientSecure client; client.setInsecure();
  HTTPClient https;
  if (!https.begin(client, INGEST_URL)) return;
  https.addHeader("Content-Type", "application/json");
  https.addHeader("x-device-id", DEVICE_ID);
  https.addHeader("Authorization", String("Bearer ") + DEVICE_TOKEN);
  // Presence only — never a BAC (the server rejects BAC from guardian sources).
  String body = String("{\"source\":\"guardian_ambient\",\"result\":\"")
              + (lvl == CLEAR ? "clear" : "detected")
              + "\",\"ppm\":" + String(max(0.0f, (1.0f - ratio) * 5.0f), 2) + "}";
  int code = https.POST(body);
  https.end();
  Serial.print(F("[uplink] -> HTTP ")); Serial.println(code);
}
#endif

// ============================================================================
void setup() {
  Serial.begin(115200);
  delay(300);
  Serial.println(F("\n=== MQ-3 Alcohol Detector ==="));

  pinMode(BUZZER_PIN, OUTPUT); digitalWrite(BUZZER_PIN, LOW);
  pinMode(LED_PIN, OUTPUT);    digitalWrite(LED_PIN, LOW);
  analogReadResolution(12);

#if USE_OLED
  Wire.begin();
  oledOk = oled.begin(SSD1306_SWITCHCAPVCC, OLED_ADDR);
  if (!oledOk) Serial.println(F("[warn] OLED not found at 0x3C — continuing without it."));
#endif

#if USE_WIFI
  showOLED("WiFi setup", "MQ3_Setup", "join to config");
  WiFiManager wm; wm.setConfigPortalTimeout(180);
  wm.autoConnect("MQ3_Setup");
#endif

  // The MQ-3 heater must stabilise or the baseline drifts badly.
  Serial.println(F("[warmup] Heating sensor (20 s)..."));
  for (uint32_t t = 0; t < WARMUP_MS; t += 1000) {
    char buf[24]; snprintf(buf, sizeof(buf), "%lu s left", (unsigned long)((WARMUP_MS - t) / 1000));
    showOLED("Warming up", buf, "please wait");
    delay(1000);
  }

  calibrate();
  Serial.println(F("ratio,level,rs_ohms,rough_ppm   <- CSV for tuning"));
}

void loop() {
  // Type 'c' in the Serial Monitor to re-calibrate in clean air at any time.
  if (Serial.available() && (Serial.read() == 'c')) calibrate();

  float rs    = readRs();
  float ratio = rs / r0;
  Level lvl   = classify(ratio);

  digitalWrite(LED_PIN, lvl >= DETECTED ? HIGH : LOW);

  char l3[26];
  snprintf(l3, sizeof(l3), "ratio %.2f", ratio);
  showOLED(lvl == CLEAR ? "Monitoring" : "ALCOHOL",
           lvl == CLEAR ? "All clear" : levelName(lvl), l3);

  // CSV line so you can watch values and set thresholds.
  Serial.print(ratio, 3);    Serial.print(',');
  Serial.print(levelName(lvl)); Serial.print(',');
  Serial.print(rs, 0);       Serial.print(',');
  Serial.println(roughPpm(ratio), 1);

  uint32_t now = millis();
  bool changed = (lvl != lastLevel);
  if (changed || (lvl >= DETECTED && now - lastReportMs > REPORT_MIN_MS)) {
    if (lvl >= DETECTED) buzz(lvl == STRONG ? 3 : 2);
#if USE_WIFI
    if (changed || lvl >= DETECTED) postEvent(lvl, ratio);
#endif
    lastLevel = lvl;
    lastReportMs = now;
  }

  delay(SAMPLE_MS);
}
