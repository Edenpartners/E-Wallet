import { EthProviders } from '../app/providers/ether.service';
import { firebaseConfig } from './firebase.config';

export const environment = {
  production: true,
  firebase: firebaseConfig,

  config: {
    handleUserState: true,
    alterStartPath: '',

    /** this is the ethereum network information which edn server running. */
    ednEthNetwork: EthProviders.KnownNetworkType.ropsten,
    signinWithEdnUserInfo: true,
    useSideMenu: false,
    patches: {
      useSignupForSignin: true
    },

    ednCoinKey: 'EDN'
  }
};

export const env = environment;
