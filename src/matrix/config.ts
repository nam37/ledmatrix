import { MatrixOptions, RuntimeOptions, GpioMapping } from 'rpi-led-matrix';
import * as dotenv from 'dotenv';

dotenv.config();

export interface MatrixConfig {
  matrixOptions: MatrixOptions;
  runtimeOptions: RuntimeOptions;
}

export function getMatrixConfig(): MatrixConfig {
  const matrixOptions: MatrixOptions = {
    rows: parseInt(process.env.MATRIX_ROWS || '64'),
    cols: parseInt(process.env.MATRIX_COLS || '64'),
    chainLength: parseInt(process.env.MATRIX_CHAIN || '3'),
    parallel: parseInt(process.env.MATRIX_PARALLEL || '1'),
    hardwareMapping: (process.env.MATRIX_GPIO_MAPPING || 'adafruit-hat') as GpioMapping,
    brightness: parseInt(process.env.MATRIX_BRIGHTNESS || '80'),
    pwmBits: parseInt(process.env.MATRIX_PWM_BITS || '11'),
  };

  const runtimeOptions: RuntimeOptions = {
    gpioSlowdown: parseInt(process.env.MATRIX_GPIO_SLOWDOWN || '4'),
  };

  return {
    matrixOptions,
    runtimeOptions,
  };
}
