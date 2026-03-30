
import {
    GetVpnBootstrap as GetVpnBootstrapBinding,
    ImportConfig as ImportConfigBinding,
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



export type VpnBootstrapData = {
    servers: ServerOption[];
    selectedUrl: string | null;
    providerName: string;
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
    };
}

export async function saveSelectedServer(url: string): Promise<void> {
    await SaveSelectedServerBinding(url);
}

export async function importConfig(link: string): Promise<VpnBootstrapData> {
    const data = await ImportConfigBinding(link);

    return {
        servers: data.servers,
        selectedUrl: data.selectedUrl || null,
        providerName: data.providerName,
    };
}

export async function measureAllServerLatencies(): Promise<VpnBootstrapData> {
    const data = await MeasureAllServerLatenciesBinding();

    return {
        servers: data.servers,
        selectedUrl: data.selectedUrl || null,
        providerName: data.providerName,
    };
}

export async function measureSelectedServerLatency(url: string): Promise<VpnBootstrapData> {
    const data = await MeasureSelectedServerLatencyBinding(url);

    return {
        servers: data.servers,
        selectedUrl: data.selectedUrl || null,
        providerName: data.providerName,
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

    await new Promise((r) => setTimeout(r, 2500));

    /*const fail = Math.random() < 0.2;
    emit(fail ? "error" : "connected");*/

    emit("connected");

    
}

export async function disconnect(): Promise<void> {
    if(currentStatus === "connecting" || currentStatus === "idle") return;

    emit("disconnecting")

    await new Promise((r) => setTimeout(r, 500));

    emit("idle");
}
