import { EthProviders } from '../app/providers/ether.service';

export interface Environment {
  production: boolean;
  firebase: any;

  config: {
    debugging: {
      disableConsoleLogging: boolean;
      logBlockchain: boolean;
      logEdnApi: boolean;
      showDebugToast: boolean;
      logIdexAPI: boolean;
    };

    useRedirectorOnDebugMode: boolean;
    handleUserState: boolean;
    alterStartPath: string;

    compareUserIDTokenOnDeeplinkHandling: boolean;
    emailVerificationRequired: boolean;

    /** this is the ethereum network information which edn server running. */
    ednEthNetwork: EthProviders.KnownNetworkType;
    signinWithEdnUserInfo: boolean;
    useSideMenu: boolean;
    useSideMenuForDebug: boolean;
    patches: {
      useSignupForSignin: boolean;
      useSigninForSignup: boolean;
      useEthAddressObject: boolean;
    };
    ednCoinKey: string;
    ednApiBaseAddress: string;

    pinCode: {
      maxPinCodeRetryCount: number;

      /**
       * for test flows of app with fingerprint supported.
       */
      testFingerprintFeature: boolean;
      testFaceIDFeature: boolean;
    };

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
