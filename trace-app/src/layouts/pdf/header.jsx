import React from "react";

const styles = {
  container: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottom: "1px solid black",
    paddingBottom: 10,
    marginBottom: 10,
  },
  logo: {
    width: 60,
    height: 60,
    objectFit: "contain",
  },
  centerText: {
    textAlign: "center",
    flex: 1,
    marginLeft: 10,
    marginRight: 10,
  },
  titleSmall: {
    fontSize: 10,
    margin: 0,
  },
  titleMedium: {
    fontSize: 12,
    fontWeight: "bold",
    margin: "2px 0",
  },
  titleLarge: {
    fontSize: 14,
    fontWeight: "bold",
    margin: "2px 0",
  },
};

const Header = () => (
  <div style={styles.container}>
    <img src="/image-removebg-preview.png" alt="" style={styles.logo} />
    <div style={styles.centerText}>
      <p style={styles.titleMedium}>Republic of the Philippines</p>
      <p style={styles.titleLarge}>CITY CIVIL REGISTRAR&apos;S OFFICE</p>
      <p style={styles.titleMedium}>City of Iligan</p>
      <p style={styles.titleSmall}>
        Ground Flr., Pedro Generalao Bldg., Buhanginan Hill, Pala-o, Iligan City
      </p>
    </div>
    <img
      src="/icon.jpg"
      alt="City seal"
      style={styles.logo}
    />
  </div>
);

export default Header;
