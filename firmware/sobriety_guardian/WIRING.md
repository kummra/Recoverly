# Sobriety Guardian — wiring & setup

Board: **Arduino Nano ESP32 (ESP32-S3)**. The SEN0376 and OLED share the I²C bus;
the MQ-3 is analog.

## Libraries (Arduino IDE → Library Manager)
- `WiFiManager` (tzapu)
- `DFRobot_Alcohol`
- `Adafruit SSD1306` + `Adafruit GFX Library`

In **Boards Manager** install **"Arduino ESP32 Boards"** and select **Arduino Nano ESP32**.

## Connections

| Component | Pin | Nano ESP32 |
|---|---|---|
| **SEN0376** alcohol sensor | VCC | 3V3 |
| | GND | GND |
| | SDA | **A4** |
| | SCL | **A5** |
| | address DIP | set to **[1,1] = ADDRESS_3 (0x75)** |
| **SSD1306 OLED** (0x3C) | VCC | 3V3 |
| | GND | GND |
| | SDA | **A4** (shared) |
| | SCL | **A5** (shared) |
| **MQ-3** module | VCC | **5V / VBUS** (heater needs 5 V) |
| | GND | GND |
| | AO | **→ voltage divider → A0** (see below ⚠) |
| | DO | not used |
| **Piezo buzzer** | + | **D9** |
| | − | GND |
| LED | — | uses on-board `LED_BUILTIN` (no wiring) |

### ⚠ MQ-3 voltage divider (do not skip)
The ESP32-S3 ADC tolerates **max 3.3 V**, but the MQ-3 `AO` can swing up to **5 V**.
Put a divider between `AO` and `A0`:

```
MQ-3 AO ──[ 10kΩ ]──┬── A0 (Nano ESP32)
                    │
                  [ 10kΩ ]
                    │
                   GND
```

Two equal 10 kΩ resistors halve the voltage (5 V → 2.5 V). The firmware accounts
for this with `MQ3_DIVIDER = 2.0`. If you use different resistors, update that
constant to `(R1 + R2) / R2`.

## Provision the device token (no password on the device)
1. Sign in to the app, then call once (replace `<ID_TOKEN>` with your Firebase ID token):
   ```bash
   curl -X POST https://recoverly-app.vercel.app/api/device/register \
     -H "Authorization: Bearer <ID_TOKEN>" \
     -H "Content-Type: application/json" \
     -d '{"label":"My Guardian","kind":"sobriety_guardian"}'
   ```
   (Once the app UI is built, this will be a button. Ask me to mint you a token in the meantime.)
2. Paste the returned `deviceId` and `token` into `DEVICE_ID` / `DEVICE_TOKEN` at the top of the `.ino`.
3. Set `DEVICE_MODE` to `MODE_PERSONAL`, `MODE_CAMPUS`, or `MODE_BREATH`.

## First boot
1. Flash. On first run it creates a Wi-Fi hotspot **`Guardian_Setup`** — join it and pick your network.
2. It warms up the MQ-3 (~20 s), then calibrates in **clean air** — keep alcohol away during this step.
3. After "READY", it streams readings to the app (Firestore live + Oracle durable).

## Calibrating the MQ-3 BAC (important — it's only an estimate until you do this)
The MQ-3 is **not** factory-calibrated. Out of the box the BAC number is a rough
estimate. To make it meaningful:
1. Let the sensor burn in (first power-up: ideally 24–48 h continuous).
2. The firmware auto-sets `mq3R0` from clean air each boot.
3. Compare its reading against a **real breathalyser** at a known value and adjust
   `MQ3_CALFACTOR` (and, if needed, `MQ3_A` / `MQ3_B` from your module's datasheet curve).
4. **Always** show MQ-3 BAC as *"estimated — not for legal/driving/medical use."*
   The SEN0376 presence detection is the trustworthy part.

## Security note
The firmware uses `client.setInsecure()` (skips TLS certificate validation) for
simplicity at the exhibition. For a hardened build, pin the server's root CA cert
instead. The device token is still required and is the real access control.
