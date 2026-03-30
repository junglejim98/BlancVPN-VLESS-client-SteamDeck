import { useState, useRef, useEffect } from "react"

type Props = {
    vlessUrl: string;
    onUrlChange: (value: string) => void;
    onSubmit: () => Promise<void>;
    isLoading: boolean;
}

export default function Header({
    vlessUrl,
    onUrlChange,
    onSubmit,
    isLoading,
}: Props) {
    const [isOpen, setIsOpen] = useState(false);
    const popoverRef = useRef<HTMLDivElement | null>(null);
    useEffect(() => {
        if(!isOpen) return;

        function handlePointer(event: MouseEvent) {
            const el = popoverRef.current;
            if(!el) return;

            const target = event.target as Node;

            if(el.contains(target)) return;

            setIsOpen(false);
        }

        document.addEventListener("mousedown", handlePointer);

        return () => {
            document.removeEventListener("mousedown", handlePointer);
        }
    }, [isOpen])

    async function handleSubmit() {
        await onSubmit();
    }

       return(  <header className={isOpen? "grid-header is-open" : "grid-header"}>
                    <div className="config-add" ref={popoverRef}>
                        <button 
                        className="icon-btn icon-btn--plus" 
                        type="button" aria-label="add config" 
                        onClick={() => setIsOpen(prev => !prev)}>
                        </button>
                        
                    <div className="popover">
                        <div className="popover__content">
                            <label htmlFor='vlessURL'>Paste VLESS URL
                                <input 
                                type="text" 
                                id="vlessURL"
                                value={vlessUrl}
                                onChange={(event) => onUrlChange(event.target.value)}
                                disabled={isLoading} />
                            </label>
                            <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={isLoading}>
                                {isLoading ? "Loading..." : "Send"}
                                </button>
                        </div>
                    </div>
                        
                    </div>
                </header>
       )
}