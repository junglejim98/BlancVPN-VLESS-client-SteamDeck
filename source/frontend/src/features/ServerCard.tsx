import { useState } from "react"

export default function ServerCard() {
    const options = ["🇳🇱 Нидерланды, Амстердам", "🇧🇷 Бразилия, Сан-Паулу", "🇭🇺 Венгрия, Будапешт", "🇦🇷 Аргентина, Буэнос-Айрес", "🇮🇱 Израиль, Тель-Авив", "🇰🇿 Казахстан, Алматы", "🇫🇮 Финляндия, Оулу", "🇪🇸 Испания, Мадрид", "🇺🇸 США, Нью-Йорк", "🇹🇷 Турция, Стамбул", "🇧🇪 Бельгия, Брюссель", "🇯🇵 Япония, Токио", "🇵🇱 Польша, Варшава", "🇨🇭 Швейцария, Цюрих", "🇫🇷 Франция, Париж", "🇺🇦 Украина, Киев"]

    const [isOpen, setIsOpen] = useState(false);
    const [selected, setSelected] = useState(-1);

    return(
                    <div className={isOpen ? "server-card is-open" : "server-card"}>
               
                        <div className="server-card-head">
                            <button className="icon-btn icon-btn--chevron" type="button" aria-label="Выбрать страну" onClick={() => setIsOpen(!isOpen)}>
                            </button>
                            <div className="server-card__info">
                                <div className="server-card__title">Name of Connection</div>
                                <div className="server-card__subtitle">Connection active</div>
                            </div>
                            <button className="icon-btn icon-btn--speed"></button>
                        </div>
                        <div className="server-card__dropdown ">
                            <div className="server-card__dropdown-inner">
                        {
                            options.map((label, i) => (
                                <button
                                    key={label}
                                    className={i === selected ? "selected": ""}
                                    onClick={()=> {
                                        setSelected(i);
                                    }}
                                    >
                                        {label}
                                    </button>
                            ))
                        }
                            </div>
                        </div>
                    </div>
                    )
}