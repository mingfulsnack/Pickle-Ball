import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from '../components/Header';
import './AppLayout.scss';

const AppLayout = () => {
  return (
    <div className="app-layout">
      <Header />
      <main className="main-content">
        <div className="content-wrapper">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AppLayout;
