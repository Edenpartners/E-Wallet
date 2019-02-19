import { Environment } from './environment.interface';
import { EthProviders } from '../app/providers/ether.service';
import { firebaseConfig } from './firebase.config';

export const environment: Environment = {
  production: true,
  firebase: firebaseConfig,

  config: {
    useRedirectorOnDebugMode: true,
    handleUserState: true,
    alterStartPath: '',
    disableConsoleLogging: true,
    logBlockchain: false,
    logEdnApi: false,
    compareUserIDTokenOnDeeplinkHandling: false,
    emailVerificationRequired: false,

    /** this is the ethereum network information which edn server running. */
    ednEthNetwork: EthProviders.KnownNetworkType.ropsten,
    signinWithEdnUserInfo: true,
    useSideMenu: true,
    useSideMenuForDebug: false,
    patches: {
      useSignupForSignin: true
    },
    ednCoinKey: 'EDN',
    showDebugToast: false,
    useDecryptPinCodeByPinCode: false,
    simulateHardwareBackButton: false,
    clearWalletsOnWipeStorage: false,
    clearPincodeOnWipeStorage: false,
    clearTxHistoryOnWipeStorage: false,
    blockSignup: true,
    firebaseFeatures: {
      analytics: false,
      google: true,
      facebook: false,
      twitter: false
    }
  }
};

export const env = environment;
