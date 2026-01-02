import { MatrixOptions, RuntimeOptions, GpioMapping, RuntimeFlag } from 'rpi-led-matrix';
import * as dotenv from 'dotenv';

dotenv.config();

export interface MatrixConfig {
  matrixOptions: MatrixOptions;
  runtimeOptions: RuntimeOptions;
}

export function getMatrixConfig(): MatrixConfig {
  const matrixOptions: MatrixOptions = {
    rows: 64,
    cols: 64,
    chainLength: 1,  // Set to 1 for single panel, change to 3 when all panels connected
    hardwareMapping: 'adafruit-hat' as GpioMapping,
    brightness: 80,
    pwmBits: 11,
    pwmLsbNanoseconds: 130,
    disableHardwarePulsing: false,
    inverseColors: false,
    ledRgbSequence: 'RGB',
    panelType: '',
    pixelMapperConfig: '',
  };

  const runtimeOptions: RuntimeOptions = {
    gpioSlowdown: 4,
    doGpioInit: true,
    dropPrivileges: RuntimeFlag.Off,
    daemon: RuntimeFlag.Off,
  };

  return {
    matrixOptions,
    runtimeOptions,
  };
}
