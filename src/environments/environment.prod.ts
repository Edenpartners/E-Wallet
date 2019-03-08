import { Environment } from './environment.interface';
import { EthProviders } from '../app/providers/ether.service';
import { firebaseConfig } from './firebase.config';

export const environment: Environment = {
  production: true,
  firebase: firebaseConfig,

  config: {
    debugging: {
      disableConsoleLogging: true,
      logBlockchain: false,
      logEdnApi: false,
      showDebugToast: false,
      logIdexAPI: false
    },
    useRedirectorOnDebugMode: false,
    handleUserState: true,
    alterStartPath: '',
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

    /** Test another ERC20 coin with replacement */
    ednCoinKey: 'EDN',
    useDecryptPinCodeByPinCode: false,
    simulateHardwareBackButton: false,
    clearWalletsOnWipeStorage: false,
    clearPincodeOnWipeStorage: false,
    clearTxHistoryOnWipeStorage: false,
    blockSignup: true,
    firebaseFeatures: {
      analytics: true,
      google: true,
      facebook: false,
      twitter: false
    }
  }
};

export const env = environment;
