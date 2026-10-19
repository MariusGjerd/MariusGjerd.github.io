// pt100_bridge.ino
// Reads a PT100 in a Wheatstone bridge two ways and prints both once per second:
//   1. The Arduino Uno's own 10-bit ADC, reading each bridge midpoint on its
//      own input and subtracting in software.
//   2. An ADS1115 module, reading the bridge difference directly on a
//      differential input with gain 16 (+/-0.256 V range).
//
// Companion sketch to the post "Why your PT100 lives in a Wheatstone bridge" by Marius Gjerd.
//
// Wiring
//   Bridge supply: Uno 3.3V pin to the top of both dividers, GND to the bottom.
//   Left divider:  3.3V -- R1 (2.2k) -- A -- R2 (100 ohm) -- GND
//   Right divider: 3.3V -- R3 (2.2k) -- B -- PT100       -- GND
//   Uno A0  <- A        Uno A1  <- B
//   ADS1115 AIN0 <- B   ADS1115 AIN1 <- A
//   ADS1115 VDD -> 5V, GND -> GND, SDA -> A4, SCL -> A5, ADDR -> GND (address 0x48)
//   No PT100 at hand? Use a 100 ohm trimmer pot and set it with a multimeter.
//   138.5 ohm is the PT100 at 100 C, 107.7 ohm is 20 C.
//
// Library: Adafruit_ADS1X15 (install it from the Arduino Library Manager).

#include <Wire.h>
#include <Adafruit_ADS1X15.h>

// ---- Circuit constants. Measure your real parts and put the values here. ----
const float VS    = 3.3;      // bridge supply in volts (measure the Uno's 3.3V pin)
const float R1    = 2200.0;   // left divider, top (ohm)
const float R2    = 100.0;    // left divider, bottom (ohm)
const float R3    = 2200.0;   // right divider, top (ohm)
const float R0    = 100.0;    // PT100 resistance at 0 C (ohm)
const float ALPHA = 0.00385;  // PT100 temperature coefficient (1/C)

// ---- Converter constants ----
// Uno ADC reference is the 5V rail, which is rarely exactly 5.0 V. On USB it is
// often 4.7 to 5.0 V. Measure the 5V pin with a multimeter and put the real value here.
const float UNO_VREF  = 5.0;            // Uno ADC reference: the 5V rail (measure it)
const float UNO_STEPS = 1024.0;         // 10 bits
const float ADS_FSR   = 0.256;          // ADS1115 full scale at GAIN_SIXTEEN (volts)
const float ADS_STEPS = 32768.0;        // 15 bits each side of zero

const unsigned long INTERVAL_MS = 1000;

Adafruit_ADS1115 ads;   // 16-bit variant (sets the right bit shift and data rate)
bool adsFound = false;

// Bridge voltage U = B - A (volts) to PT100 resistance (ohm).
// U = VS * (rt / (R3 + rt) - R2 / (R1 + R2)), solved for rt.
float bridgeToResistance(float u) {
  float x = u / VS + R2 / (R1 + R2);   // x = rt / (R3 + rt)
  return x * R3 / (1.0 - x);
}

// PT100 resistance (ohm) to temperature (C).
// rt = R0 * (1 + ALPHA * t), solved for t.
float resistanceToTemp(float rt) {
  return (rt / R0 - 1.0) / ALPHA;
}

void setup() {
  Serial.begin(9600);
  while (!Serial) {
    ; // wait for the serial port on boards that need it
  }

  ads.setGain(GAIN_SIXTEEN);   // +/-0.256 V, 7.8 microvolts per step
  adsFound = ads.begin();      // default I2C address 0x48
  if (!adsFound) {
    Serial.println("ADS1115 not found. Check wiring and address. Printing Uno values only.");
  }

  Serial.println("unoA unoB unoU_mV unoT_C | adsRaw adsU_mV adsT_C");
}

void loop() {
  // --- 1. Uno built-in ADC: two single-ended readings, subtracted ---
  // Each input measures against GND, so A0 sees about 0.14 V and A1 about
  // 0.15 to 0.20 V. The bridge signal is the small difference between them.
  analogRead(A0);                 // throwaway read lets the input settle
  int rawA = analogRead(A0);
  analogRead(A1);
  int rawB = analogRead(A1);

  float vA = rawA * UNO_VREF / UNO_STEPS;
  float vB = rawB * UNO_VREF / UNO_STEPS;
  float unoU = vB - vA;           // about 4.9 mV per step on each input
  float unoT = resistanceToTemp(bridgeToResistance(unoU));

  Serial.print(rawA);
  Serial.print(' ');
  Serial.print(rawB);
  Serial.print(' ');
  Serial.print(unoU * 1000.0, 1);
  Serial.print(' ');
  Serial.print(unoT, 1);

  // --- 2. ADS1115: one differential reading, AIN0 - AIN1 = B - A ---
  Serial.print(" | ");
  if (adsFound) {
    int16_t adsRaw = ads.readADC_Differential_0_1();
    float adsU = adsRaw * ADS_FSR / ADS_STEPS;
    float adsT = resistanceToTemp(bridgeToResistance(adsU));

    Serial.print(adsRaw);
    Serial.print(' ');
    Serial.print(adsU * 1000.0, 3);
    Serial.print(' ');
    Serial.println(adsT, 2);
  } else {
    Serial.println("- - -");
  }

  delay(INTERVAL_MS);
}
