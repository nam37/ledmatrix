# Hardware Setup Guide

Complete wiring and assembly instructions for the LED Matrix Controller.

## Bill of Materials

| Component | Quantity | Notes |
|-----------|----------|-------|
| Raspberry Pi 4 (4GB+) | 1 | Tested on 16GB model |
| Adafruit Triple RGB Matrix Bonnet | 1 | For HUB75 panels |
| 64×64 RGB LED Matrix (2.5mm, 1/32 scan) | 3 | Indoor P3 panels |
| 5V 15A Power Supply | 1 | 75W for LED panels |
| 27W USB-C Power Supply | 1 | For Raspberry Pi |
| HUB75 Ribbon Cables | 3 | 16-pin IDC cables |
| Power Distribution Bus (7-port) | 1 | Brass screw terminals |
| Barrel Jack → Screw Terminal Adapter | 1 | For power supply |
| JST Power Cables | 3 | 2-pin, included with panels |

## Power Architecture

**CRITICAL:** LED panels and Raspberry Pi use separate power supplies!

```
LED Panels Power:
[5V 15A Supply] → [Barrel Adapter] → [Distribution Bus] → [3× Panels]

Raspberry Pi Power:
[27W USB-C Supply] → [Pi 4 USB-C Port]
```

### Power Supply Specifications

**LED Panel Supply:**
- Voltage: 5V DC
- Current: 15A minimum (20A recommended)
- Power: 75W minimum
- Connector: 5.5×2.1mm barrel jack

**Raspberry Pi Supply:**
- Voltage: 5.1V DC
- Current: 5A
- Power: 27W
- Connector: USB-C

## Physical Layout

### Option A: Horizontal Strip (64×192) - RECOMMENDED

```
┌─────────┬─────────┬─────────┐
│ Panel 1 │ Panel 2 │ Panel 3 │
│  64×64  │  64×64  │  64×64  │
└─────────┴─────────┴─────────┘
     ↑
  DATA IN (from Bonnet Port 1)
```

**Display Size:** 64 pixels tall × 192 pixels wide

**Configuration:**
```env
MATRIX_CHAIN=3
MATRIX_PARALLEL=1
```

### Option B: Vertical Stack (192×64)

```
┌─────────┐
│ Panel 1 │ ← Port 1
│  64×64  │
├─────────┤
│ Panel 2 │ ← Port 2
│  64×64  │
├─────────┤
│ Panel 3 │ ← Port 3
│  64×64  │
└─────────┘
```

**Display Size:** 192 pixels tall × 64 pixels wide

**Configuration:**
```env
MATRIX_CHAIN=1
MATRIX_PARALLEL=3
```

## Step-by-Step Assembly

### Safety First

⚠️ **CRITICAL SAFETY RULES:**
1. **NEVER** plug or unplug components while powered
2. **ALWAYS** power panels BEFORE the Pi
3. **ALWAYS** power off the Pi BEFORE panels
4. Double-check polarity on ALL power connections

### Step 1: Install the Bonnet

**Power must be OFF for both Pi and panels!**

1. Place Pi on anti-static surface
2. Align Adafruit Triple RGB Matrix Bonnet with 40-pin header
3. Press down firmly and evenly until fully seated
4. Verify no pins are bent or misaligned

### Step 2: Connect Data Cables (Daisy-Chain)

**For Horizontal Layout:**

1. Connect first HUB75 cable:
   - One end → Bonnet **Port 1**
   - Other end → **Panel 1 INPUT**

2. Connect second cable:
   - One end → **Panel 1 OUTPUT**
   - Other end → **Panel 2 INPUT**

3. Connect third cable:
   - One end → **Panel 2 OUTPUT**
   - Other end → **Panel 3 INPUT**

**HUB75 Connector Orientation:**
- Red stripe = Pin 1
- Match arrow markings on panel PCB
- Connector should click when seated

### Step 3: Wire Power Distribution

**Prepare the Distribution Bus:**

1. Connect barrel jack adapter to 5V 15A supply
2. Wire adapter to distribution bus:
   - Red wire → **+5V** terminal
   - Black wire → **GND** terminal
3. Tighten screw terminals firmly

**Connect Panel Power:**

1. Take 3× white JST power cables
2. Plug JST connectors into panels (they only fit one way)
3. Connect bare wire ends to distribution bus:
   - All **red wires** → **+5V** side
   - All **black wires** → **GND** side
4. Tighten all connections
5. Gently tug each wire to verify secure connection

**Polarity Check:**
```
Panel Connector:  [+5V] [GND]
Wire Colors:       RED   BLACK
Distribution Bus:  (+)    (-)
```

⚠️ **Double-check before powering!** Reversed polarity = instant panel destruction.

### Step 4: Power-On Sequence

**ALWAYS follow this order:**

1. ✅ Verify all connections are secure
2. ✅ Double-check power polarity
3. ✅ Plug in **LED panel 5V supply** → Panels should remain dark (no data yet)
4. ✅ Plug in **Pi's USB-C supply** → Pi boots up
5. ✅ SSH into Pi and run software
6. ✅ Panels light up with content

**Power-Off Sequence:**

1. Stop the LED matrix software (`Ctrl+C`)
2. Unplug **Pi's USB-C supply**
3. Unplug **LED panel supply**

### Step 5: Cable Management

**Tips for clean wiring:**

- Zip-tie ribbon cables together
- Keep power and data cables separated
- Label each panel (1, 2, 3)
- Use cable clips to prevent strain on connectors
- Leave slack for panel repositioning

## Panel Specifications

### 64×64 RGB LED Matrix Details

| Specification | Value |
|--------------|-------|
| Resolution | 64×64 pixels |
| Pixel Pitch | 2.5mm |
| Scan Rate | 1/32 |
| Colors | RGB (16M colors) |
| Interface | HUB75E |
| Dimensions | ~160×160mm |
| Weight | ~300g |
| Power Draw | 3-4A @ 5V (peak 5A) |

### HUB75 Pinout

```
HUB75 IDC Connector (16-pin):

 1  R0   Red data (upper half)
 2  G0   Green data (upper half)
 3  B0   Blue data (upper half)
 4  GND  Ground
 5  R1   Red data (lower half)
 6  G1   Green data (lower half)
 7  B1   Blue data (lower half)
 8  E    Row select E (1/32 scan)
 9  A    Row select A
10  B    Row select B
11  C    Row select C
12  D    Row select D
13  CLK  Clock
14  STB  Strobe/Latch
15  OE   Output Enable
16  GND  Ground
```

## Troubleshooting

### No Power to Panels

- ✅ Check 5V supply is plugged in and switched on
- ✅ Verify green LED on power supply is lit
- ✅ Test voltage at distribution bus with multimeter (should read ~5V)
- ✅ Check all screw terminals are tight

### Panels Powered But No Display

- ✅ Verify HUB75 cables are fully inserted
- ✅ Check ribbon cable orientation (red stripe = pin 1)
- ✅ Ensure software is running with `sudo`
- ✅ Try different `--led-slowdown-gpio` values (4, 5, 6)

### Flickering or Ghosting

- ✅ Increase GPIO slowdown: `MATRIX_GPIO_SLOWDOWN=6`
- ✅ Reduce brightness: `MATRIX_BRIGHTNESS=60`
- ✅ Check for loose ribbon cables
- ✅ Verify panel power supply is stable 5V (not sagging under load)

### Wrong Colors

- ✅ Check HUB75 cable orientation
- ✅ Try different `--led-rgb-sequence` values
- ✅ Verify panel type in config

### Only First Panel Works

- ✅ Verify `MATRIX_CHAIN=3` in `.env`
- ✅ Check OUTPUT → INPUT connections between panels
- ✅ Test each panel individually by connecting directly to Port 1

### Pi Won't Boot

- ✅ Use adequate power supply (27W minimum)
- ✅ Check SD card is properly inserted
- ✅ Try booting Pi without bonnet attached

## Performance Tips

### Optimal Settings for Pi 4

```env
MATRIX_GPIO_SLOWDOWN=5
MATRIX_BRIGHTNESS=80
MATRIX_PWM_BITS=11
```

### Reduce CPU Load

- Lower refresh rate if not running animations
- Use static modes (clock, text) instead of video
- Disable unused services on Pi

### Heat Management

- Ensure Pi has adequate ventilation
- Consider heatsinks or fan if running 24/7
- Monitor CPU temp: `vcgencmd measure_temp`

## Mounting Suggestions

### Wall Mount

- Use M3 mounting holes in panel corners
- Maintain 10mm gap behind panels for ventilation
- Keep cables accessible for maintenance

### Desktop Stand

- Use adjustable photo frame stands
- Secure with adhesive velcro or zip ties
- Angle slightly upward for better viewing

## Maintenance

### Regular Checks

- Monthly: Tighten all screw terminals
- Quarterly: Clean panel surface with microfiber cloth
- Annually: Check for loose ribbon cables

### Cleaning

- Power off completely before cleaning
- Use dry microfiber cloth only
- Never spray liquids directly on panels
- Avoid touching LEDs with bare fingers

## Advanced: Adding More Panels

The Adafruit Triple RGB Matrix Bonnet supports:
- Up to **3 parallel chains**
- Each chain can have multiple panels

**Example: 6 Panels (2×3 grid):**
```env
MATRIX_ROWS=64
MATRIX_COLS=64
MATRIX_CHAIN=2    # 2 panels per chain
MATRIX_PARALLEL=3 # 3 chains
```

**Total:** 128×192 display

**Power requirement:** 30A @ 5V minimum

## Support

For hardware issues:
- Panel problems: Contact panel manufacturer
- Bonnet issues: [Adafruit support](https://www.adafruit.com/support)
- Pi issues: [Raspberry Pi forums](https://forums.raspberrypi.com/)

## Diagrams

### Complete System Wiring

```
                    ┌──────────────┐
                    │ Raspberry Pi │
                    │      4       │
                    └──────┬───────┘
                           │ GPIO Header
                    ┌──────▼───────┐
                    │  RGB Matrix  │
                    │    Bonnet    │
                    └──────┬───────┘
                           │ Port 1
                    ┌──────▼───────┐
            ┌───────┤   Panel 1    │
            │       │    64×64     │
            │       └──────┬───────┘
  ┌─────────▼──┐           │ Output
  │ 5V 15A PSU │    ┌──────▼───────┐
  │            │────┤   Panel 2    │
  │ Power Dist │    │    64×64     │
  │    Bus     │    └──────┬───────┘
  └─────────┬──┘           │ Output
            │       ┌──────▼───────┐
            └───────┤   Panel 3    │
                    │    64×64     │
                    └──────────────┘
```

---

**Document Version:** 1.0
**Last Updated:** 2025-12-29
**Hardware Tested:** Raspberry Pi 4, Adafruit Triple Bonnet, Generic 64×64 P3 panels
