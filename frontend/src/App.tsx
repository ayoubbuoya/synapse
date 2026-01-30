import { useAccount } from 'wagmi';
import { Landing } from './components/Landing';
import { Dashboard } from './components/Dashboard';

function App() {
  const { isConnected, address } = useAccount();

  if (!isConnected || !address) {
    return <Landing />;
  }

  return <Dashboard address={address} />;
}

export default App;
