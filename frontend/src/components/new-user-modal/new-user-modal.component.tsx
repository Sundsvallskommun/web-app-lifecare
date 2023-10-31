import ValidatedInput from '@components/validated-input/validated-input.component';
import { NewUserModalProps, SelectedItem } from '@interfaces/user';
import { lookUpCitizen, newContractor } from '@services/contractor.service';
import { getPersonDetails } from '@services/person.service';
import { Button, Divider, Modal, Select, useMessage } from '@sk-web-gui/react';
import { luhnCheck, validateEmail, validatePhone } from '@utils/validation';
import { ChangeEvent, useEffect, useState } from 'react';

const NewUserModal: React.FC<NewUserModalProps> = ({ onClose, onSave, show, isAdmin }) => {
  // User info
  const [personId, setPersonId] = useState('');
  const [SSN, setSSN] = useState('');
  const [nickName, setNickName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [monthsToAdd, setMonthsToAdd] = useState(1);
  const [selectedCompanies, setSelectedCompanies] = useState([]);
  // Validation states
  const [isSSNValid, setIsSSNValid] = useState(false);
  const [isEmailValid, setIsEmailValid] = useState(false);
  const [isPhoneValid, setIsPhoneValid] = useState(false);
  const [infoFetched, setInfoFetched] = useState(false);
  const [infoButtonClicked, setInfoButtonClicked] = useState(false);
  // Validation errors
  const [SSNError, setSSNError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [phoneError, setPhoneError] = useState('');

  const message = useMessage();

  useEffect(() => {
    if (!show) {
      // Reset all internal state when the modal is closed
      setSSN('');
      setFirstName('');
      setLastName('');
      setNickName('');
      setEmail('');
      setPhone('');
      setMonthsToAdd(1);
      setSelectedCompanies([]);

      setSSNError('');
      setEmailError('');
      setPhoneError('');
    }
  }, [show]);

  const companies = [
    { id: 1, name: 'Företag 1' },
    { id: 2, name: 'Företag 2' },
    { id: 3, name: 'Företag 3' },
  ];

  const handleCompanyChange = (selectedItems: SelectedItem[]) => {
    if (!selectedItems || !Array.isArray(selectedItems)) {
      console.error('Invalid selectedItems format:', selectedItems);
      return;
    }

    const lastSelectedItem = selectedItems[selectedItems.length - 1];

    if (!lastSelectedItem || !lastSelectedItem.data) {
      console.error('Invalid lastSelectedItem format:', lastSelectedItem);
      return;
    }

    const updatedSelectedCompanies = [...selectedCompanies];

    // Check if the last selected item is already in the array
    const existingIndex = updatedSelectedCompanies.findIndex((company) => company.id === lastSelectedItem.data.id);

    if (existingIndex !== -1) {
      // Item exists, remove it from the array
      updatedSelectedCompanies.splice(existingIndex, 1);
    } else {
      // Item doesn't exist, add it to the array
      updatedSelectedCompanies.push(lastSelectedItem.data);
    }

    // Update the state with the modified array
    setSelectedCompanies(updatedSelectedCompanies);
  };

  const handleSave = async () => {
    await newContractor({
      personId: personId,
      ttlMonths: monthsToAdd,
      emailAddress: email,
      restrictedMobile: phone,
    });
    message({
      message: 'Användaren skapades.',
      status: 'success',
      position: 'bottom-right',
    });
    if (onSave) {
      onSave();
    }
  };

  const handleGetInfo = async () => {
    console.log('Hämtar info');

    try {
      console.log('Result SSNSSNSSN:', SSN);
      const citizen = await lookUpCitizen(SSN);

      if (citizen.data) {
        console.log(citizen);
        setPersonId(citizen.data.personId);
        setFirstName(citizen.data.givenname);
        setLastName(citizen.data.lastname);
        // ... set other state based on the result data if needed
        setInfoFetched(true);

        message({
          message: 'Informationen hämtades.',
          status: 'success',
          position: 'bottom-right',
        });
      } else {
        message({
          message: 'Okänt fel uppstod.',
          status: 'error',
          position: 'bottom-right',
        });
      }
    } catch (error) {
      console.error('Error fetching person details:', error);
      message({
        message: 'Error när persond detaljerna skulle hämtas. Vänligen försök igen.',
        status: 'error',
        position: 'bottom-right',
      });
    }
    setInfoButtonClicked(true);
  };

  const validateSSN = (ssn) => {
    const pattern = /^\d{8}[-]?\d{4}$/;

    if (!pattern.test(ssn)) {
      return false;
    }

    // Remove dashes and any other non-numeric characters
    const cleanSSN = ssn.replace(/[^0-9]/g, '');

    if (cleanSSN.length !== 12) {
      return false;
    }

    return luhnCheck(cleanSSN);
  };

  const handleSSNChange = (e: ChangeEvent<HTMLInputElement>) => {
    const ssnValue = e.target.value;
    setSSN(ssnValue);
    const isValid = validateSSN(ssnValue);
    setIsSSNValid(isValid);
    setSSNError(isValid ? '' : 'Ogiltigt personnummer, det behöver vara 12 siffror.');
    setInfoButtonClicked(false);
  };

  const handleEmailChange = (e: ChangeEvent<HTMLInputElement>) => {
    const emailValue = e.target.value;
    setEmail(emailValue);
    const isValid = validateEmail(emailValue);
    setIsEmailValid(isValid);
    setEmailError(isValid ? '' : 'Ogiltig e-post');
  };

  const handlePhoneChange = (e: ChangeEvent<HTMLInputElement>) => {
    const phoneValue = e.target.value;
    setPhone(phoneValue);
    const isValid = validatePhone(phoneValue);
    setIsPhoneValid(isValid);
    setPhoneError(
      isValid
        ? ''
        : 'Ogiltigt telefonnummer, det måste starta med +46 sen 9 siffror till och ej innehålla: bindestreck eller mellanslag.'
    );
  };

  return (
    <Modal
      show={show}
      label="Ny användare"
      onClose={onClose}
      className="h-full font-semibold w-3/3 lg:w-2/3 xl:w-2/4 2xl:w-1/3"
    >
      <div className="flex flex-col gap-7">
        <h2 id="newUserModalLabel" className="sr-only">
          Ny användare
        </h2>

        <label className="flex justify-between items-center">
          <span className="flex items-center">
            Personnummer
            <abbr className="no-underline text-red-500 ml-1" title="Obligatoriskt fält">
              *
            </abbr>
          </span>
          <span id="ssnDescription" className="sr-only">
            Ange ett giltigt personnummer.
          </span>
          <ValidatedInput
            type="text"
            value={SSN}
            error={SSNError}
            onChange={handleSSNChange}
            aria-describedby="ssnDescription"
            id="SSNInput"
          />
        </label>

        <div className="flex justify-end ">
          <Button
            color="primary"
            variant="solid"
            onClick={handleGetInfo}
            disabled={!isSSNValid || infoButtonClicked}
            aria-label="Hämta användar information"
          >
            Hämta information
          </Button>
        </div>

        <label className="flex justify-between items-center">
          <label className={`flex items-center ${!lastName ? 'text-gray-600' : ''}`} htmlFor="firstNameInput">
            Förnamn
          </label>

          <div className="w-4/6 flex flex-col">
            <input className="h-14 text-base border border-gray-600 py-2 px-3" value={firstName} readOnly disabled />
          </div>
        </label>

        <label className="flex justify-between items-center" htmlFor="lastNameInput">
          <label className={`flex items-center ${!lastName ? 'text-gray-600' : ''}`} htmlFor="lastNameInput">
            Efternamn
          </label>
          <div className="w-4/6 flex flex-col">
            <input
              className="h-14 text-base border border-gray-600 py-2 px-3"
              value={lastName}
              readOnly
              disabled
              id="lastNameInput"
              name="lastName"
            />
          </div>
        </label>

        <Divider />

        <label className="flex justify-between items-center" htmlFor="nickNameInput">
          Tilltalsnamn
          <input
            className="h-14 w-4/6 text-base"
            type="text"
            value={nickName}
            onChange={(e) => setNickName(e.target.value)}
          />
        </label>

        <span className="font-normal">Tilltalsnamn används då användarnamnet genereras.</span>

        <label className="flex justify-between items-center" htmlFor="emailInput">
          <div className="flex items-center">
            E-post
            <abbr className="text-red-500 ml-1 no-underline" title="Obligatoriskt fält">
              *
            </abbr>
          </div>
          <ValidatedInput type="email" value={email} error={emailError} onChange={handleEmailChange} id="emailInput" />
        </label>

        <label className="flex justify-between items-center" htmlFor="phoneInput">
          <div className="flex items-center">
            Telefonnummer
            <abbr className="text-red-500 ml-1 no-underline" title="Obligatoriskt fält">
              *
            </abbr>
          </div>
          <ValidatedInput type="text" value={phone} error={phoneError} onChange={handlePhoneChange} id="phoneInput" />
        </label>

        <label className="flex justify-between items-center" htmlFor="endDate">
          Slutdatum
          <select
            className="h-14 w-4/6 text-base"
            value={monthsToAdd}
            onChange={(e) => setMonthsToAdd(parseInt(e.target.value, 10))}
          >
            <option value={1}>Om 1 månad</option>
            <option value={2}>Om 2 månader</option>
            <option value={3}>Om 3 månader</option>
          </select>
        </label>

        {isAdmin && (
          <label className="flex justify-between items-center">
            Företag
            <div className="h-14 w-4/6">
              <Select
                multiple
                value={selectedCompanies.map((company) => ({ label: company?.name, data: company }))}
                onChange={handleCompanyChange}
                aria-label="Välj företag"
              >
                {companies.map((company) => (
                  <Select.Option key={company.id} value={{ label: company.name, data: company }}>
                    {company.name}
                  </Select.Option>
                ))}
              </Select>
            </div>
          </label>
        )}

        <div className="flex justify-between">
          <Button variant="outline" onClick={onClose} aria-label="Avbryt och stäng modalen">
            Avbryt
          </Button>
          <Button
            color="primary"
            variant="solid"
            onClick={handleSave}
            disabled={
              !isSSNValid || !isPhoneValid || !isEmailValid || !SSN || !phone || !firstName || !lastName || !infoFetched
            }
            aria-label="Spara ny användare"
          >
            Spara
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default NewUserModal;
