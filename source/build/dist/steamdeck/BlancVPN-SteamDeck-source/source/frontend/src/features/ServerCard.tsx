import { useMemo, useState } from "react"
import type { ServerOption } from "../api/vpn";

type Props = {
    providerName: string;
    servers: ServerOption[];
    selectedUrl: string | null;
    testingServerUrl: string | null;
    isMeasuringAll: boolean;
    onSelectServer: (url: string) => void;
    onMeasureLatencies: () => Promise<void>;
    onMeasureSelectedServerLatency: () => Promise<void>;
    isLoading?: boolean;
}

export default function ServerCard({
    providerName,
    servers,
    selectedUrl,
    testingServerUrl,
    isMeasuringAll,
    onSelectServer,
    onMeasureLatencies,
    onMeasureSelectedServerLatency,
    isLoading = false}: Props) {

    const [isOpen, setIsOpen] = useState(false);
    
    const selectedServer = useMemo(() => {
        return servers.find((server) => server.url === selectedUrl) ?? null
    }, [servers, selectedUrl]);

    function handleSelect(url: string) {
        onSelectServer(url);
        setIsOpen(true);
    }

    const isSelectedServerTesting = Boolean(selectedServer && testingServerUrl === selectedServer.url);

    function handleMeasureAll() {
        setIsOpen(true);
        void onMeasureLatencies();
    }

    function handleMeasureSelected() {
        if (!selectedServer) {
            return;
        }

        setIsOpen(true);
        void onMeasureSelectedServerLatency();
    }

    const subtitle = 
    selectedServer 
    ? selectedServer.label
    : isLoading
    ? "Loading servers..."
    : "Select server";
    
    
    return(
                    <div className={isOpen ? "server-card is-open" : "server-card"}>
               
                        <div className="server-card-head">
                            <button 
                            className="icon-btn icon-btn--chevron" 
                            type="button" 
                            aria-label="Выбрать страну" 
                            onClick={() => setIsOpen((prev) => !prev)}
                            disabled={servers.length === 0}
                            />
                            <div className="server-card__info">
                                <div className="server-card__title">{providerName}</div>
                                <button
                                className="server-card__subtitle"
                                type="button"
                                onClick={handleMeasureSelected}
                                disabled={isLoading || !selectedServer}
                                >
                                    {subtitle}
                                    {selectedServer ? <LatencyValue server={selectedServer} isTesting={isSelectedServerTesting} /> : null}
                                </button>
                            </div>
                            <button 
                            className="icon-btn icon-btn--speed"
                            type = "button"
                            aria-label="Проверить задержку на всех серверах"
                            onClick={handleMeasureAll}
                            disabled={isLoading || isMeasuringAll || servers.length === 0}
                            />
                        </div>
                        <div className="server-card__dropdown ">
                            <div className="server-card__dropdown-inner">
                        {
                            servers.map((server) => (
                                <button
                                    key={server.id}
                                    type="button"
                                    className={selectedUrl === server.url ? "selected": ""}
                                    onClick={()=> {
                                        handleSelect(server.url);
                                    }}
                                    >
                                        <span>{server.label}</span>
                                        <LatencyValue
                                            server={server}
                                            isTesting={Boolean(
                                                testingServerUrl === server.url ||
                                                (isMeasuringAll && selectedUrl === server.url)
                                            )}
                                        />
                                    </button>
                            ))
                        }
                            </div>
                        </div>
                    </div>
                    )
}

function WaveDots() {
    return (
        <span className="latency-wave" aria-label="Testing latency">
            <span>.</span>
            <span>.</span>
            <span>.</span>
        </span>
    );
}

function LatencyValue({
    server,
    isTesting,
}: {
    server: ServerOption;
    isTesting: boolean;
}) {
    if (isTesting) {
        return (
            <span className="latency-value">
                <WaveDots />
            </span>
        );
    }

    if (!server.latencyMs) {
        return null;
    }

    return <span className="latency-value">· {server.latencyMs} ms</span>;
}
