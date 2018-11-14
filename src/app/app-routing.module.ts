import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { TabsPageModule } from './pages/samples/tabs/tabs.module';
import { TabsPage } from './pages/samples/tabs/tabs.page';

const routes: Routes = [
  { path: '', redirectTo: 'ethtest', pathMatch: 'full' },
  // { path: '', redirectTo: 'me', pathMatch: 'full' },
  { path: 'me', loadChildren: './pages/samples/tabs/tabs.module#TabsPageModule' },
  { path: 'home', loadChildren: './pages/samples/home/home.module#HomePageModule' },
  { path: 'ethtest', loadChildren: './pages/ethtest/ethtest.module#EthtestPageModule' },
  { path: 'signin', loadChildren: './pages/signin/signin.module#SigninPageModule' }
];

// log a routing state
const traceRouting = false;

@NgModule({
  imports: [RouterModule.forRoot(routes, { enableTracing: traceRouting })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
