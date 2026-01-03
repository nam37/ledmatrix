import { MatrixOptions, RuntimeOptions, GpioMapping, RuntimeFlag, MuxType, RowAddressType, ScanMode } from 'rpi-led-matrix';
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
    chainLength: 2,  // 2 panels chained horizontally = 128x64 display
    hardwareMapping: GpioMapping.Regular,  // Using 'regular' mapping as shown in working demo
    brightness: 80,
    pwmBits: 11,
    pwmLsbNanoseconds: 130,
    disableHardwarePulsing: false,  // Sound module disabled in /boot/firmware/config.txt
    inverseColors: false,
    ledRgbSequence: 'RGB',
    panelType: '',
    pixelMapperConfig: '',
    parallel: 1,
    pwmDitherBits: 0,
    limitRefreshRateHz: 0,
    multiplexing: MuxType.Direct,
    rowAddressType: RowAddressType.Direct,
    scanMode: ScanMode.Progressive,  // Default is 0 = progressive
    showRefreshRate: false,
  };

  const runtimeOptions: RuntimeOptions = {
    gpioSlowdown: 5 as any,  // Override TypeScript limit - demo uses 5
    doGpioInit: true,
    dropPrivileges: RuntimeFlag.Off,
    daemon: RuntimeFlag.Off,
  };

  return {
    matrixOptions,
    runtimeOptions,
  };
}
