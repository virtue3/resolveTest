import React from 'react';
import './App.css';
import { EntityFetchBar } from './components/entityFetchBar';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <p>Entity Viewer Application</p>
      </header>
      <body className="Main-Body">
        <EntityFetchBar/>
      </body>
    </div>
  );
}

export default App;
