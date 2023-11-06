import ValidatedInput from '@components/validated-input/validated-input.component';
import { NewUserModalProps, SelectedItem } from '@interfaces/user';
import { lookUpCitizen, newContractor } from '@services/contractor.service';
import { getOrganizationByTreeLevelAndCompanyId } from '@services/organization.service';
import { Button, Divider, Modal, Select, useMessage } from '@sk-web-gui/react';
import { luhnCheck, validateEmail, validatePhone } from '@utils/validation';
import { ChangeEvent, useEffect, useState } from 'react';
import useCompanyStore from 'src/store/useCompanyStore.store';
import useContractorStore from 'src/store/useContractorStore.store';

const NewUserModal: React.FC<NewUserModalProps> = ({ onClose, onSave, show, isAdmin }) => {
  // User info
  const [personId, setPersonId] = useState('');
  const [SSN, setSSN] = useState('');
  const [nickName, setNickName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [companies, setCompanies] = useState([]);
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

  const [isLoading, setIsLoading] = useState(false);

  const fetchContractorData = useContractorStore((s) => s.fetchContractorData);
  const { companyList, fetchCompanies } = useCompanyStore();

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

  useEffect(() => {
    fetchCompanies();
  }, []);

  const handleCompanyChange = (selectedItems) => {
    const orgIds = selectedItems.map((item) => item.data.orgId);

    setCompanies(orgIds); // This will save the array of orgIds
    setSelectedCompanies(selectedItems);
    console.log('companies', companies);
    console.log('selectedCompanies', selectedCompanies);
  };

  const handleSave = async () => {
    // const orgIds = selectedCompanies.map((company) => company.data.orgId);
    for (const orgId of companies) {
      try {
        await newContractor({
          personId: personId,
          ttlMonths: monthsToAdd,
          emailAddress: email,
          orgId: orgId, // Here you pass the single orgId
          restrictedMobile: phone,
        });
        // You might want to send a message for each success or just once after all have been created
        message({
          message: `Användaren skapades för orgId: ${orgId}.`,
          status: 'success',
          position: 'bottom-right',
        });
      } catch (error) {
        console.error(`Error creating contractor for orgId ${orgId}:`, error);
        // Break out of the loop or handle the error accordingly
        message({
          message: `Error när användaren skapades för orgId ${orgId}.`,
          status: 'error',
          position: 'bottom-right',
        });
        break; // If you want to stop creating new contractors on the first error
      }
    }

    if (onSave) {
      onSave();
      fetchContractorData();
    }
  };

  const handleGetInfo = async () => {
    setIsLoading(true);

    try {
      const citizen = await lookUpCitizen(SSN);

      if (citizen.data) {
        console.log(citizen);
        setPersonId(citizen.data.personId);
        setFirstName(citizen.data.givenname);
        setLastName(citizen.data.lastname);
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
    } finally {
      setIsLoading(false);
      setInfoButtonClicked(true);
    }
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
            loading={isLoading}
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
              <Select multiple value={selectedCompanies} onChange={handleCompanyChange} aria-label="Välj företag">
                {companyList?.map((company) => (
                  <Select.Option key={company.orgId} value={{ label: company.orgName, data: company }}>
                    {company.orgName}
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
