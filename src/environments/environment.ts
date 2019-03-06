import { Environment } from './environment.interface';
import { EthProviders } from '../app/providers/ether.service';
import { firebaseConfig } from './firebase.config';

// The file contents for the current environment will overwrite these during build.
// The build system defaults to the dev environment which uses `environment.ts`, but if you do
// `ng build --env=prod` then `environment.prod.ts` will be used instead.
// The list of which env maps to which file can be found in `.angular-cli.json`.
export const environment: Environment = {
  production: false,
  firebase: firebaseConfig,

  config: {
    debugging: {
      disableConsoleLogging: false,
      logBlockchain: false,
      logEdnApi: false,
      showDebugToast: false,
      logIdexAPI: true
    },

    useRedirectorOnDebugMode: true,
    handleUserState: false,
    alterStartPath: '',
    compareUserIDTokenOnDeeplinkHandling: false,
    emailVerificationRequired: false,

    /** this is the ethereum network information which edn server running. */
    ednEthNetwork: EthProviders.KnownNetworkType.ropsten,

    signinWithEdnUserInfo: true,
    useSideMenu: true,
    useSideMenuForDebug: true,
    patches: {
      useSignupForSignin: true
    },

    /** Test another ERC20 coin with replacement */
    ednCoinKey: 'EDN',
    useDecryptPinCodeByPinCode: false,
    simulateHardwareBackButton: true,
    clearWalletsOnWipeStorage: false,
    clearPincodeOnWipeStorage: false,
    clearTxHistoryOnWipeStorage: false,
    blockSignup: false,
    firebaseFeatures: {
      analytics: false,
      google: false,
      facebook: false,
      twitter: false
    }
  }
};

export const env = environment;

/*
 * In development mode, to ignore zone related error stack frames such as
 * `zone.run`, `zoneDelegate.invokeTask` for easier debugging, you can
 * import the following file, but please comment it out in production mode
 * because it will have performance impact when throw error
 */
// import 'zone.js/dist/zone-error';  // Included with Angular CLI.
