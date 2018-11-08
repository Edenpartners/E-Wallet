import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { TabsPageModule } from './pages/samples/tabs/tabs.module';
import { TabsPage } from './pages/samples/tabs/tabs.page';

const routes: Routes = [
  // { path: '', redirectTo: '/tabs/(home:home)', pathMatch: 'full' },
  // { path: '', redirectTo: 'home', pathMatch: 'full' },
  // { path: '', loadChildren: './pages/samples/tabs/tabs.module#TabsPageModule' },
  { path: '', redirectTo: 'me', pathMatch: 'prefix' },
  { path: 'me', loadChildren: './pages/samples/tabs/tabs.module#TabsPageModule' },
  // { path: 'tabs2', loadChildren: './pages/samples/tabs2/tabs2.module#Tabs2PageModule' },
  // { path: 'tabs', loadChildren: './pages/samples/tabs/tabs.router.module#TabsPageRoutingModule' },
  // { path: 'tabs', loadChildren: './pages/samples/tabs/tabs.module#TabsPageModule' },
  // { path: 'tabs', component: TabsPageModule },
  // { path: 'tabs2', loadChildren: './pages/samples/tabs2/tabs2.module#TabsPageModule' },
  { path: 'home', loadChildren: './pages/samples/home/home.module#HomePageModule' },
  { path: 'ethtest', loadChildren: './pages/ethtest/ethtest.module#EthtestPageModule' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
