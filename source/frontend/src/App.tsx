import Header from './features/Header';
import PowerButton from './components/PowerButton';
import ServerCard from './features/ServerCard';
import Footer from './features/Footer';
import './App.css';

function App() {

    return (
        <div id="App">
            <div className="container grid-12">
                <Header />
                <main className="grid-main">
                <PowerButton />
                <ServerCard />
                </main>
                <Footer />
            </div>
        </div>
    )
}

export default App
