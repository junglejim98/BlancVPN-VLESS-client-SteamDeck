
import {
    Connect as ConnectBinding,
    Disconnect as DisconnectBinding,
    GetDependencyStatus as GetDependencyStatusBinding,
    GetConnectionStatus as GetConnectionStatusBinding,
    GetVpnBootstrap as GetVpnBootstrapBinding,
    ImportConfig as ImportConfigBinding,
    InstallDependencies as InstallDependenciesBinding,
    MeasureAllServerLatencies as MeasureAllServerLatenciesBinding,
    MeasureSelectedServerLatency as MeasureSelectedServerLatencyBinding,
    SaveSelectedServer as SaveSelectedServerBinding,
} from "../../wailsjs/go/main/App.js";
import { EventsOn } from "../../wailsjs/runtime/runtime.js";

export type ServerOption = {
    id: string;
    label: string;
    url: string;
    host: string;
    latencyMs: number;
};

export type VpnStatus = "idle" | "connecting" | "connected" | "disconnecting" |"error";

export type DependencyStatus = {
    ready: boolean;
    xray: boolean;
    tun2socks: boolean;
    xrayConfigDir: boolean;
    v2rayConfigDir: boolean;
    message: string;
};

export type VpnBootstrapData = {
    servers: ServerOption[];
    selectedUrl: string | null;
    providerName: string;
    dependenciesInstalled: boolean;
}

export type LatencyUpdateEvent = {
    url: string;
    latencyMs: number;
}

type StatusHandler = (status: VpnStatus) => void;

let currentStatus: VpnStatus = "idle";
const handlers = new Set<StatusHandler>();

function emit(status: VpnStatus) {
    currentStatus = status;
    handlers.forEach((h) => h(status));
}

export async function getVpnBootstrap(): Promise<VpnBootstrapData> {
    const data = await GetVpnBootstrapBinding();

    return {
        servers: data.servers,
        selectedUrl: data.selectedUrl || null,
        providerName: data.providerName,
        dependenciesInstalled: Boolean(data.dependenciesInstalled),
    };
}

export async function getDependencyStatus(): Promise<DependencyStatus> {
    const data = await GetDependencyStatusBinding();

    return {
        ready: Boolean(data.ready),
        xray: Boolean(data.xray),
        tun2socks: Boolean(data.tun2socks),
        xrayConfigDir: Boolean(data.xrayConfigDir),
        v2rayConfigDir: Boolean(data.v2rayConfigDir),
        message: data.message || "",
    };
}

export async function getConnectionStatus(): Promise<VpnStatus> {
    const status = String(await GetConnectionStatusBinding());

    switch (status) {
        case "connected":
        case "connecting":
        case "disconnecting":
        case "error":
            return status;
        default:
            return "idle";
    }
}

export async function saveSelectedServer(url: string): Promise<void> {
    await SaveSelectedServerBinding(url);
}

export async function installDependencies(): Promise<string> {
    return InstallDependenciesBinding();
}

export async function importConfig(link: string): Promise<VpnBootstrapData> {
    const data = await ImportConfigBinding(link);

    return {
        servers: data.servers,
        selectedUrl: data.selectedUrl || null,
        providerName: data.providerName,
        dependenciesInstalled: Boolean(data.dependenciesInstalled),
    };
}

export async function measureAllServerLatencies(): Promise<VpnBootstrapData> {
    const data = await MeasureAllServerLatenciesBinding();

    return {
        servers: data.servers,
        selectedUrl: data.selectedUrl || null,
        providerName: data.providerName,
        dependenciesInstalled: Boolean(data.dependenciesInstalled),
    };
}

export async function measureSelectedServerLatency(url: string): Promise<VpnBootstrapData> {
    const data = await MeasureSelectedServerLatencyBinding(url);

    return {
        servers: data.servers,
        selectedUrl: data.selectedUrl || null,
        providerName: data.providerName,
        dependenciesInstalled: Boolean(data.dependenciesInstalled),
    };
}

export function onLatencyUpdate(handler: (event: LatencyUpdateEvent) => void) {
    return EventsOn("latency:update", (event: LatencyUpdateEvent) => {
        handler(event);
    });
}

export function onStatus(handler: StatusHandler) {
    handlers.add(handler);

    handler(currentStatus);

    return () => handlers.delete(handler); 
}

export async function connect(url: string): Promise<void> {
    if (currentStatus === "connecting" || currentStatus === "connected") return;

    emit("connecting");
    try {
        await ConnectBinding(url);
        emit(await getConnectionStatus());
    } catch (error) {
        emit("error");
        throw error;
    }
}

export async function disconnect(): Promise<void> {
    if(currentStatus === "connecting" || currentStatus === "idle") return;

    emit("disconnecting");
    try {
        await DisconnectBinding();
        emit(await getConnectionStatus());
    } catch (error) {
        emit("error");
        throw error;
    }
}
