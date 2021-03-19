import React from 'react';
import { createStore } from 'redux';
import {Provider} from 'react-redux'
import reducer from './store/reducer.js'
import AppContent from './AppContent'

const store = createStore(reducer);

export default function App() {
 
  return(
    <Provider store={store}>
    <AppContent></AppContent>
    </Provider>
  )
};


