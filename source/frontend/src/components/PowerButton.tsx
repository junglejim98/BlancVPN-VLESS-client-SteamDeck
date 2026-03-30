
import { useState, useEffect } from "react";
import type { VpnStatus } from "../api/vpn";

type Props = {
    status: VpnStatus;
    onConnect: () => Promise<void>;
    onDisconnect: () => Promise<void>;
    disabled?: boolean; 
}

export default function PowerButton ({ 
    status, 
    onConnect, 
    onDisconnect,
    disabled = false, 
}: Props){
    const isConnecting = status === "connecting";
    const isConnected = status === "connected";
    const isDisconnecting = status === "disconnecting";
    const isError = status === "error";

    const [disconnectPressed, setDisconnectPressed] = useState(false);

    const isPressed = isConnecting || isDisconnecting || disconnectPressed;

    let stationClass = "power-station" + 
    (isConnecting ? " is-connecting" : "") + 
    (isConnected ? " is-connected": "") + 
    (isDisconnecting ? " is-disconnecting" : "") +
    (isError ? " is-error" : "") +
    (isPressed ? " pressed" : "");
    
    async function handleClick() {
        if (isConnecting || isDisconnecting || disabled) return;

        if (isConnected) {
            setDisconnectPressed(true);
            setTimeout(() => {
                setDisconnectPressed(false);
            }, 120);
            await onDisconnect();
        } else {
            await onConnect();
        }
    } 
    
    useEffect(() => {
        if (
            status === "idle" ||
            status === "connected" ||
            status === "error"
        ) {
            setDisconnectPressed(false);
        }
    }, [status]);
    return(
            <div className={stationClass}>
                <button 
                className="power-button" 
                type="button"
                aria-label={isConnected ? "Disconnect VPN" : "Connect VPN"}
                onClick={handleClick}
                disabled={isConnecting || isConnecting || isDisconnecting}>

                </button>
                </div>
)
}