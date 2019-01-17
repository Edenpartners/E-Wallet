import { EthProviders } from '../app/providers/ether.service';
import { firebaseConfig } from './firebase.config';

export const environment = {
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
    emailVerificationRequired: true,

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
    blockSignup: true
  }
};

export const env = environment;
