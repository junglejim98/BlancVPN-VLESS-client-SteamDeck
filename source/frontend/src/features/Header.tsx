import { useState } from "react"


export default function Header() {
    const [isOpen, setIsOpen] = useState(false);

       return(  <header className={isOpen? "grid-header is-open" : "grid-header"}>
                    <div className="config-add">
                        <button className="icon-btn icon-btn--plus" type="button" aria-label="add config" onClick={() => setIsOpen(!isOpen)}>
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
       )
}