# MQ-3 Alcohol Detector — wiring & first run

Simple build: **MQ-3 only**. OLED and WiFi are optional (flags at the top of the
sketch). Board: **Arduino Nano ESP32**.

## Libraries (Arduino IDE → Library Manager)
- `Adafruit SSD1306` + `Adafruit GFX Library` — only if `USE_OLED 1`
- `WiFiManager` (tzapu) — only if `USE_WIFI 1`

Boards Manager → install **Arduino ESP32 Boards** → select **Arduino Nano ESP32**.

## Connections

| Component | Pin | Nano ESP32 |
|---|---|---|
| **MQ-3** | VCC | **5V (VBUS)** — the heater needs 5 V, not 3.3 V |
| | GND | GND |
| | AO | **→ divider → A0** (see below ⚠) |
| | DO | not used |
| **Buzzer** | + | **D9** |
| | − | GND |
| **OLED** (optional) | VCC | 3V3 |
| | GND | GND |
| | SDA | **A4** |
| | SCL | **A5** |
| LED | — | on-board `LED_BUILTIN`, no wiring |

### ⚠ The one thing you must not skip: the voltage divider
The MQ-3's `AO` can output up to **5 V**. The ESP32-S3 ADC pins are **3.3 V max** —
connecting AO straight to A0 can damage the board. Use two equal resistors
(10 kΩ each is ideal; 1 kΩ–100 kΩ works as long as they match):

```
MQ-3 AO ──[ 10kΩ ]──┬── A0 (Nano ESP32)
                    │
                  [ 10kΩ ]
                    │
                   GND
```

That halves the voltage; the sketch compensates via `MQ3_DIVIDER = 2.0`.
Using different resistors? Set `MQ3_DIVIDER = (R1 + R2) / R2`.

## First run
1. Flash with `USE_WIFI 0` (standalone — get the sensor working before adding network).
2. Open **Serial Monitor at 115200**.
3. It warms the heater for 20 s, then calibrates in **clean air** — keep alcohol
   away during this step. It prints `R0`.
4. You'll then see a CSV stream:
   ```
   ratio,level,rs_ohms,rough_ppm
   0.998,clear,10240,0.4
   ```
   In clean air **ratio should sit near 1.00**.

## Testing it
Hold an alcohol source (hand sanitiser, a swab, or an actual drink) near the sensor.
Ratio should **drop** — the lower it goes, the more alcohol. LED lights and the
buzzer sounds at `DETECTED`.

⏳ Give it **20–60 s to recover** afterwards; MQ-3 sensors clear slowly.
Type **`c`** in the Serial Monitor to re-calibrate in clean air any time.

## Tuning the thresholds
Watch the `ratio` column during real tests, then edit these in the sketch:
```cpp
const float RATIO_TRACE    = 0.90;  // "something is there"
const float RATIO_DETECTED = 0.60;  // "clearly alcohol"
const float RATIO_STRONG   = 0.35;  // "strong source"
```
- Too many false alarms → **lower** the numbers (e.g. 0.85 / 0.50 / 0.30)
- Not sensitive enough → **raise** them

## Burn-in matters
A brand-new MQ-3 drifts for its first **24–48 hours** of continuous power. Readings
before that are usable but unstable; re-calibrate (`c`) after a long burn-in for a
much steadier baseline.

## Streaming to the app (later)
Set `USE_WIFI 1`, then get a device token once:
```bash
curl -X POST https://recoverly-app.vercel.app/api/device/register \
  -H "Authorization: Bearer <FIREBASE_ID_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"label":"MQ-3 detector","kind":"campus_detector"}'
```
Paste the returned `deviceId` / `token` into the sketch. Events then land in
Firestore (live) and Oracle (durable). On first boot it opens a `MQ3_Setup`
hotspot to pick your WiFi.

## Honest limits
- This reports **presence and relative strength**, not BAC. An uncalibrated MQ-3
  cannot give a trustworthy blood-alcohol number.
- It responds to **any** alcohol vapour — hand sanitiser, perfume, cleaning spray,
  mouthwash — not just drinks.
- It drifts with **temperature and humidity**. Re-calibrate when conditions change.
