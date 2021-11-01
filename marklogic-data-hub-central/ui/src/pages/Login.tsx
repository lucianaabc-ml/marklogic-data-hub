import React from "react";
import styles from "./Login.module.scss";
import LoginForm from "../components/login-form/login-form";
import HCSider from "../components/common/hc-side/hc-side";

const Login: React.FC = () => {

  return (
    <div style={{display: "flex", justifyContent: "space-between"}}>
      <HCSider show={false} placement="left" showButtonLabel>
        <div>
          <h6>title</h6>
          <p>
            Lorem ipsum dolor sit, amet consectetur adipisicing elit. Est dolores dolor laborum doloribus! Molestias qui provident,
          </p>
        </div>
      </HCSider>
      <div className={styles.content}>
        <div className={styles.loginContainer}>
          <LoginForm />
        </div>
      </div>

    </div>
  );
};

export default Login;