import { EthProviders } from '../app/providers/ether.service';

export interface Environment {
  production: boolean;
  firebase: any;

  config: {
    useRedirectorOnDebugMode: boolean;
    handleUserState: boolean;
    alterStartPath: string;
    disableConsoleLogging: boolean;
    logBlockchain: boolean;
    logEdnApi: boolean;
    compareUserIDTokenOnDeeplinkHandling: boolean;
    emailVerificationRequired: boolean;

    /** this is the ethereum network information which edn server running. */
    ednEthNetwork: EthProviders.KnownNetworkType;
    signinWithEdnUserInfo: boolean;
    useSideMenu: boolean;
    useSideMenuForDebug: boolean;
    patches: {
      useSignupForSignin: boolean;
    };
    ednCoinKey: string;
    showDebugToast: boolean;
    useDecryptPinCodeByPinCode: boolean;
    simulateHardwareBackButton: boolean;
    clearWalletsOnWipeStorage: boolean;
    clearPincodeOnWipeStorage: boolean;
    clearTxHistoryOnWipeStorage: boolean;
    blockSignup: boolean;
    firebaseFeatures: {
      analytics: boolean;
      google: boolean;
      facebook: boolean;
      twitter: boolean;
    };
  };
}
