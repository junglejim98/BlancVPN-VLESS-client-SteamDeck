type Props = {
    onInstall: () => Promise<void>;
    isInstalling: boolean;
    disabled?: boolean;
    statusText?: string;
}

export default function InstallDependenciesButton({
    onInstall,
    isInstalling,
    disabled = false,
    statusText = "",
}: Props) {
    return (
        <div className="install-deps">
            <button
                className="install-deps__button"
                type="button"
                onClick={onInstall}
                disabled={disabled || isInstalling}
            >
                {isInstalling ? "Installing..." : "Install dependencies"}
            </button>
            {statusText ? <div className="install-deps__status">{statusText}</div> : null}
        </div>
    );
}
