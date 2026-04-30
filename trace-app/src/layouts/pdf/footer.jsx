import React from "react";

const Footer = () => {
  return (
    <div style={styles.footerContainer}>
      {/* Left Section (Contact Details) */}
      <div style={styles.contactDetails}>
        <p className="text-blue-600" style={styles.contactText}>CONTACT DETAILS:</p>
        <p style={styles.contactText}>Telephone No.: (063) 228-1311</p>
        <p style={styles.contactText}>Email: civilregistrar.iligan@gmail.com</p>
      </div>

     

      {/* Right Section (Tagline) */}
      <div style={styles.tagline}>
        <p className="text-blue-600" style={styles.taglineText}>
            Be counted,
        </p>
        <p className="text-blue-600" style={styles.taglineText}>
            Get REGISTERED!
        </p>
      </div>
    </div>
  );
};

const styles = {
  footerContainer: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: "20px",
    borderTop: "1px solid black",
    paddingTop: "10px",
  },
  contactDetails: {
    flex: 1,
    fontSize: "10px",
  },
  contactText: {
    margin: "0",
  },
  tagline: {
    flex: 2,
    textAlign: "right",
  },
  taglineText: {
    fontStyle: "italic",
    fontSize: "10px",
  },
};

export default Footer;