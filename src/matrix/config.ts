import { MatrixOptions, RuntimeOptions, GpioMapping } from 'rpi-led-matrix';
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
    chainLength: 3,
    hardwareMapping: 'adafruit-hat' as GpioMapping,
  };

  const runtimeOptions: RuntimeOptions = {
    gpioSlowdown: 4,
  };

  return {
    matrixOptions,
    runtimeOptions,
  };
}
