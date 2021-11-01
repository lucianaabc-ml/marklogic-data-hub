import React, {useState} from "react";
import styles from "./hc-side.module.scss";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faStream, faTable, faAngleDoubleRight, faAngleDoubleLeft} from "@fortawesome/free-solid-svg-icons";


export interface HCSideProps {
  show: boolean,
  showButtonLabel?: boolean,
  openIcon?: React.ReactNode,
  closeIcon?: React.ReactNode,
  closeButton?: string,
  footer?: React.ReactNode,
  children: React.ReactNode,
  placement: "left" | "right",
  width?: string
}

function HCSider({show, footer, children, closeIcon, openIcon, closeButton, showButtonLabel, placement, width}: HCSideProps): JSX.Element {
  const [open, setOpen] = useState(show);
  let button = closeButton ? closeButton : open ? "close" : "open";
  let size = !open ? `0` : width ? width : `20vw`;
  let iconOpen = openIcon ? openIcon : placement === "left" ? <FontAwesomeIcon aria-label="collapsed" icon={faAngleDoubleRight} size="lg" style={{fontSize: "16px", color: "#000"}} /> : <FontAwesomeIcon aria-label="expanded" icon={faAngleDoubleLeft} size="lg" style={{fontSize: "16px", color: "#000"}} />;
  let iconClose = closeIcon ? closeIcon : placement === "left" ? <FontAwesomeIcon aria-label="expanded" icon={faAngleDoubleLeft} size="lg" style={{fontSize: "16px", color: "#000"}} /> : <FontAwesomeIcon aria-label="collapsed" icon={faAngleDoubleRight} size="lg" style={{fontSize: "16px", color: "#000"}} />;
  let icon = open ? iconClose : iconOpen;

  const handleOpen = (event) => {
    event.preventDefault();
    setOpen(!open);
  };

  return (
    <div className={styles.sideContainer} style={{width: size}}>
      <a data-testid="side-action" onClick={handleOpen} className={styles.sideIndicatorContainer} style={{[placement]: `100%`}}>{icon}{showButtonLabel && button}</a>
      {open && <div className={styles.sideContentContainer}>{children}</div>}
      {open && (footer && <div className={styles.sideFooterContainer}>{footer}</div>)}
    </div>
  );
}


export default HCSider;

