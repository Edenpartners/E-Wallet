import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { TabsPageModule } from './pages/samples/tabs/tabs.module';
import { TabsPage } from './pages/samples/tabs/tabs.page';

const startPath = 'home';

const routes: Routes = [
  { path: '', redirectTo: startPath, pathMatch: 'full' },
  // { path: '', redirectTo: 'me', pathMatch: 'full' },
  { path: 'me', loadChildren: './pages/samples/tabs/tabs.module#TabsPageModule' },
  { path: 'ethtest', loadChildren: './pages/ethtest/ethtest.module#EthtestPageModule' },
  { path: 'signin', loadChildren: './pages/signin/signin.module#SigninPageModule' },
  { path: 'signup', loadChildren: './pages/signup/signup.module#SignupPageModule' },
  { path: 'signup-profile', loadChildren: './pages/signup-profile/signup-profile.module#SignupProfilePageModule' },
  { path: 'home', loadChildren: './pages/home/home.module#HomePageModule' }
];

// log a routing state
const traceRouting = false;

@NgModule({
  imports: [RouterModule.forRoot(routes, { enableTracing: traceRouting })],
  exports: [RouterModule]
})
export class AppRoutingModule {}