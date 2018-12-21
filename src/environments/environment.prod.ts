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
    compareUserIDTokenOnDeeplinkHandling: false,

    /** this is the ethereum network information which edn server running. */
    ednEthNetwork: EthProviders.KnownNetworkType.ropsten,
    signinWithEdnUserInfo: true,
    useSideMenu: false,
    useSideMenuForDebug: false,
    patches: {
      useSignupForSignin: true
    },

    ednCoinKey: 'EDN',
    showDebugToast: false,
    useDecryptPinCodeByPinCode: false
  }
};

export const env = environment;
