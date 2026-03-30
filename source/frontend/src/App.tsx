import Header from './features/Header';
import PowerButton from './components/PowerButton';
import ServerCard from './features/ServerCard';
import Footer from './features/Footer';
import './App.css';
import { useEffect, useState, useMemo } from 'react';

import { 
    onStatus, 
    connect, 
    disconnect, 
    getVpnBootstrap, 
    importConfig,
    measureAllServerLatencies,
    measureSelectedServerLatency,
    onLatencyUpdate,
    saveSelectedServer, 
    type VpnStatus, 
    type ServerOption 
} from './api/vpn';


function App() {
    const [servers, setServers] = useState<ServerOption[]>([]);
    const [selectedUrl, setSelectedUrl] = useState<string | null>(null);
    const [providerName, setProviderName] = useState("Name of Connection");
    const [status, setStatus] = useState<VpnStatus>("idle");
    const [isLoading, setIsLoading] = useState(true);
    const [isMeasuringAll, setIsMeasuringAll] = useState(false);
    const [testingServerUrl, setTestingServerUrl] = useState<string | null>(null);
    const [error, setError] = useState("");
    const [vlessUrl, setVlessUrl] = useState("");

    async function handleSendConfig() {
        if(!vlessUrl.trim()) {
            setError("Paste VLESS URL first");
            return;
        }
        setIsLoading(true);
        setError("");

        try {
            const data = await importConfig(vlessUrl);

            setServers(data.servers);
            setSelectedUrl(data.selectedUrl);
            setProviderName(data.providerName);
            setVlessUrl("");
        } catch(err) {
            setError("Failed to import config");
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        async function loadBootstrap() {
      try {
        const data = await getVpnBootstrap();

        setServers(data.servers);
        setSelectedUrl(data.selectedUrl);
        setProviderName(data.providerName);
      } catch (error) {
        setError("Failed to load VPN bootstrap data");
        console.error("Failed to load VPN bootstrap data:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadBootstrap();
    }, []);

    useEffect(() => {
        const unsubscribe = onStatus((nextStatus) => setStatus(nextStatus));

        return () => {
            unsubscribe();
        }
    }, []);

    useEffect(() => {
        const unsubscribe = onLatencyUpdate((event) => {
            setServers((currentServers) =>
                currentServers.map((server) =>
                    server.url === event.url
                        ? {...server, latencyMs: event.latencyMs}
                        : server,
                ),
            );
        });

        return () => {
            unsubscribe();
        };
    }, []);

    const selectedServer = useMemo(() => {
        return servers.find((server) => server.url === selectedUrl) ?? null;
    }, [servers, selectedUrl]);

    async function handleSelectServer(url: string) {
        setSelectedUrl(url);

        try {
            await saveSelectedServer(url);
        } catch (error) {
            setError("Failed to save selected server");
            console.error("Failed to save selected server", error);
        }
    }

    async function handleConnect() {
        if(!selectedUrl) {
            console.log("No server selected");
            return;
        }

        try {
           
            await connect(selectedUrl);
         
        } catch (error) {
            console.error("Connect failed:", error);
            setError("Connect failed");
            setStatus("error");
        }
    }

    async function handleMeasureLatencies() {
        setIsMeasuringAll(true);
        setError("");

        try {
            const data = await measureAllServerLatencies();
            setServers(data.servers);
            setSelectedUrl(data.selectedUrl);
            setProviderName(data.providerName);
        } catch (error) {
            setError("Latency check failed");
            console.error("Latency check failed:", error);
        } finally {
            setIsMeasuringAll(false);
        }
    }

    async function handleMeasureSelectedServerLatency() {
        if (!selectedUrl) {
            return;
        }

        setTestingServerUrl(selectedUrl);
        setError("");

        try {
            const data = await measureSelectedServerLatency(selectedUrl);
            setServers(data.servers);
            setSelectedUrl(data.selectedUrl);
            setProviderName(data.providerName);
        } catch (error) {
            setError("Latency check failed");
            console.error("Selected server latency check failed:", error);
        } finally {
            setTestingServerUrl(null);
        }
    }

    async function handleDisconnect() {
        try {
            await disconnect();
        } catch(error) {
            console.error("Disconnect failed:", error);
            setError("Disconnect failed");
            setStatus("error");
        }
    }

    return (
        <div id="App">
            <div className="container grid-12">
                <Header 
                vlessUrl={vlessUrl}
                onUrlChange={setVlessUrl}
                onSubmit={handleSendConfig}
                isLoading={isLoading}
                />
                <main className="grid-main">
                <PowerButton 
                    status={status}
                    onConnect={handleConnect}
                    onDisconnect={handleDisconnect}
                    disabled={!selectedUrl || isLoading}
                />
                <ServerCard 
                    providerName={providerName}
                    servers={servers}
                    selectedUrl={selectedUrl}
                    testingServerUrl={testingServerUrl}
                    isMeasuringAll={isMeasuringAll}
                    onSelectServer={handleSelectServer}
                    onMeasureLatencies={handleMeasureLatencies}
                    onMeasureSelectedServerLatency={handleMeasureSelectedServerLatency}
                    isLoading={isLoading}
                />
                
                </main>
                <Footer />
            </div>
        </div>
    )
}

export default App
