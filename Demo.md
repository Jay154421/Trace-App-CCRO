# B-TRACE System: Step-by-Step Demo & Walkthrough

Welcome to the **B-TRACE System** (Document Requirements Tracking for Delayed Registration of Birth). This system is designed to streamline the complex process of managing late/delayed birth certificate applications, tracking rigorous document requirements, and securely capturing required photos and scanned documents offline.

This guide provides a comprehensive step-by-step walkthrough of the system's key features, user flow, and practical use cases.

---

## 🌟 Key Features

1. **Complete Applicant Tracking:** Easily manage all delayed/late registration applicants in one centralized local database.
2. **Dynamic Document Checklists:** Automatically generates a customized list of required documents based on applicant age, location, and situational conditions (e.g., deceased registrant, foreign parent).
3. **Built-in Camera & Crop Tool:** Directly capture IDs and documents using an integrated camera tool with an intuitive aspect-ratio cropper.
4. **Interactive Dashboard:** Get a bird's-eye view of your data with dynamic charts showing applicant age groups and registration statuses (Completed vs. Pending).
5. **PDF Generation:** Automatically map applicant data to official forms and export ready-to-print PDFs.
6. **Fully Offline & Air-gapped:** Built as an Electron desktop app with a local SQLite database ensuring 100% data privacy. Includes highly reliable `.zip` backup/restore functionality.

---

## 🔄 User Flow: Step-by-Step Demo

### Step 1: Dashboard Overview
When you launch the B-TRACE System, you are greeted by the **Dashboard**.
- **Metrics at a Glance**: View the total number of applicants, and a quick breakdown of **Completed** vs. **Pending** registrations.
- **Visual Charts**: 
  - *Applicants by Age Group* (Bar Chart) allows you to see the demographic distribution.
  - *Registration Status* (Pie Chart) visualizes how many applicants have provided all required documents.
- **Data Portability**: Use the **Export Backup** and **Import Backup** buttons at the top right to safely export or import the entire SQLite database and file attachments as a `.zip` archive.

### Step 2: Adding a New Applicant
To start a new delayed birth certificate registration:
1. Click the **Add Applicant** button (or navigate to the applicant form).
2. Fill in the standard demographic fields: First Name, Last Name, Date of Birth, Place of Birth, and Contact Number.
3. **Conditional Requirements**: Check any specific scenarios that apply:
   - *Registrant is deceased* (Triggers a death certificate requirement).
   - *HILOT is deceased* (Triggers a specific death certificate requirement).
   - *One parent is a foreigner* (Triggers a Passport/BI Certificate requirement).
4. Click **Save**. The system instantly calculates the applicant's exact age and age group, moving you to their dedicated profile.

### Step 3: Managing the Document Checklist
Document tracking is the core of the B-TRACE System. On the Applicant Profile, click **Document Checklist**.
1. **Dynamic Requirements**: You will see a list of required documents tailored specifically to the applicant (e.g., standard requirements plus conditional ones like an Out-of-Town Affidavit if applicable).
2. **Attaching Documents**:
   - **Upload**: Click to attach existing files from your local computer.
   - **Capture**: Click the camera icon to open the built-in webcam tool. 
3. **Smart Cropping**: When taking a picture of a document or a 2x2 ID photo, the app opens a smart cropping overlay. Frame the document, resize the bounding box, and save. The image is automatically scaled, cropped, and named securely.
4. Once an attachment is added, the requirement is marked as **Checked**.

### Step 4: Certificate of Live Birth
Once the basic demographic data and documents are tracked, you can prepare the official form:
1. Navigate to the **Certificate of Live Birth** tab from the applicant's profile.
2. Fill out detailed form parameters (e.g., specific hospital codes, parent information, birth order, attending physician). 
3. The system ensures all data entry fields match the spatial layout of the official physical birth certificate document.

### Step 5: Generating the Official PDF
With the checklist fully completed and the certificate details filled:
1. Go to the Applicant Profile.
2. Ensure the Progress Bar for documents is 100% complete (Incomplete profiles cannot generate secure documents).
3. Click **Save as PDF**.
4. The Electron system will silently compile the physical layouts, mapping your database fields to the exact coordinate positions needed. It exports a securely named, ready-to-print or ready-to-email PDF to your hard drive.

---

## 💼 Practical Use Cases

### 1. Local Government Units (Civil Registry Offices)
A civil registry clerk uses B-TRACE to process delayed registrations of birth. The clerk quickly types the applicant's details. The system flags that the applicant is 8 years old, automatically adjusting the checklist to require specific school records or baptismal certificates instead of standard infant requirements.

### 2. Field Registrations & Mobile Clinics
Staff deployed to remote areas can run B-TRACE on a laptop without any internet connection. They use a standard external webcam to scan required documents and take ID photos on the spot. At the end of the day, the staff clicks **Export Backup**, puts the secure `.zip` on a flash drive, and imports it to the main desktop computer at the central office.

### 3. Application Auditing & Reporting
A supervisor logs into the Dashboard to review the weekly performance. By looking at the charts, they quickly identify that 40% of applications are currently "Pending" due to missing documents. They can drill down into the Recent Applicants list to contact individuals with missing conditional requirements.
