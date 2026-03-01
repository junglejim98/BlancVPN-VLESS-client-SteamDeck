import {useState} from 'react';
import logo from './assets/images/logo-universal.png';
import './App.css';
import {Greet} from "../wailsjs/go/main/App";

function App() {
    const [resultText, setResultText] = useState("Please enter your name below 👇");
    const [name, setName] = useState('');
    const updateName = (e: any) => setName(e.target.value);
    const updateResultText = (result: string) => setResultText(result);

    function greet() {
        Greet(name).then(updateResultText);
    }

    return (
        <div id="App">
            <div className="container grid-12">
                <header className="grid-header is-open">
                    <div className="config-add">
                        <button className="icon-btn icon-btn--plus" type="button" aria-label="add config">
                        </button>
                    <div className="popover">
                        <div className="popover__content">
                            <label htmlFor='vlessURL'>Paste VLESS URL
                                <input type="text" id="vlessURL" />
                            </label>
                            <button>Send</button>
                        </div>
                    </div>
                    </div>
                </header>
                <main className="grid-main">
                    <button className="power-button"></button>
                    <div className="server-card is-open">
                        <div className="server-card-head">
                            <button className="icon-btn icon-btn--chevron" type="button" aria-label="Выбрать страну">
                            </button>
                            <div className="server-card__info">
                                <div className="server-card__title">Name of Connection</div>
                                <div className="server-card__subtitle">Connection active</div>
                            </div>
                            <button className="icon-btn icon-btn--speed"></button>
                        </div>
                        <div className="server-card__dropdown ">
                        <button>🇳🇱 Нидерланды, Амстердам</button>
                        <button>🇳🇱 Нидерланды, Амстердам</button>
                        <button>🇳🇱 Нидерланды, Амстердам</button>
                        <button>🇳🇱 Нидерланды, Амстердам</button>
                        <button className="selected">🇳🇱 Нидерланды, Амстердам</button>
                        <button>🇳🇱 Нидерланды, Амстердам</button>
                        <button>🇳🇱 Нидерланды, Амстердам</button>
                        <button>🇳🇱 Нидерланды, Амстердам</button>
                        <button>🇳🇱 Нидерланды, Амстердам</button>
                        <button>🇳🇱 Нидерланды, Амстердам</button>
                        <button>🇳🇱 Нидерланды, Амстердам</button>
                        <button>🇳🇱 Нидерланды, Амстердам</button>
                        <button>🇳🇱 Нидерланды, Амстердам</button>
                        <button>🇳🇱 Нидерланды, Амстердам</button>
                        <button>🇳🇱 Нидерланды, Амстердам</button>
                        <button>🇳🇱 Нидерланды, Амстердам</button>
                        </div>
                    </div>
    
                </main>
                <footer className="grid-footer">
                <div className="credits">
                Made by FF68 2026©
                </div>
                </footer>
            </div>
        </div>
    )
}

export default App
