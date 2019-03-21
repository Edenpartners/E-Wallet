export class Consts {
  static APP_INTERNAL_VERSION_NUMBER = 1;
  static GLOBAL_SECRET = '#sk3Vikj@3+.Z';

  static TEDN_DEFAULT = '_default_';
  static TEDN_DECIMAL = 18;

  static ETH_CODE = 'ETH';
  static ETH_DECIMAL = 18;

  static PIN_CODE_LENGTH = 6;

  static TEDN_DEPOSIT_CUSTOM_FILTER = {};

  static USDC_SYMBOL = 'USDC';
  static USDC_DECIMAL = 6;

  static EVENT_OPEN_SIDE_MENU = 'ui:openSideMenu';
  static EVENT_CONFIRM_PIN_CODE = 'ui:confirmPinCode';
  static EVENT_PIN_CODE_RESULT = 'pincode.result';
  static EVENT_SHOW_MODAL = 'ui:showModal';
  static EVENT_CLOSE_MODAL = 'ui:closeModal';
  static EVENT_QR_SCAN_RESULT = 'qrscan.result';

  static FINGER_PRINT_OPTIONS = {
    clientId: 'ewallet-fingerprint', //Key for platform keychain
    clientSecret: 'password', //Secret password. Only for android
    disableBackup: true, //Disable 'use backup' option. Only for android (optional)
    localizedFallbackTitle: 'Use Pin', //Title of fallback button. Only for iOS
    localizedReason: 'Scan your fingerprint please' //Description in authentication dialogue. Only for iOS
  };
}
