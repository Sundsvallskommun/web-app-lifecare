import ValidatedInput from '@components/validated-input/validated-input.component';
import { NewUserModalProps } from '@interfaces/user';
import { lookUpCitizen, newContractor } from '@services/contractor.service';
import { Button, Combobox, Divider, FormLabel, Input, Modal, Select, useSnackbar } from '@sk-web-gui/react';
import { luhnCheck, validateEmail, validatePhone } from '@utils/validation';
import { ChangeEvent, useEffect, useRef, useState } from 'react';
import useCompanyStore from 'src/store/useCompanyStore.store';
import useContractorStore from 'src/store/useContractorStore.store';

const NewUserModal: React.FC<NewUserModalProps> = ({ onClose, onSave, show, triggerElement }) => {
  // User info
  const [personId, setPersonId] = useState('');
  const [SSN, setSSN] = useState('');
  const [nickName, setNickName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [monthsToAdd, setMonthsToAdd] = useState(0);
  const [selectedCompanyIds, setSelectedCompanyIds] = useState([]);

  // Validation states
  const [isSSNValid, setIsSSNValid] = useState(false);
  const [isEmailValid, setIsEmailValid] = useState(false);
  const [isPhoneValid, setIsPhoneValid] = useState(false);
  const [isEndDateValid, setIsEndDateValid] = useState(false);
  const [infoButtonClicked, setInfoButtonClicked] = useState(false);
  // Validation errors
  const [SSNError, setSSNError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [endDateError, setEndDateError] = useState('');
  const [companyError, setCompanyError] = useState('');

  const [isLoading, setIsLoading] = useState(false);

  const fetchContractorData = useContractorStore((s) => s.fetchContractorData);
  const { companyList, fetchCompanies } = useCompanyStore();

  const snackbar = useSnackbar();

  useEffect(() => {
    if (!show) {
      // Reset all internal state when the modal is closed
      setSSN('');
      setFirstName('');
      setLastName('');
      setNickName('');
      setEmail('');
      setPhone('');
      setMonthsToAdd(0);
      setSelectedCompanyIds([]);

      setSSNError('');
      setEmailError('');
      setPhoneError('');
      setIsEndDateValid(false);
      setEndDateError('');
      setCompanyError('');
    }
  }, [show]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const modalRef = useRef(null);

  useEffect(() => {
    if (show) {
      // Focus the modal when it opens
      modalRef.current.focus();
    } else if (triggerElement) {
      // Return focus to the trigger element when the modal closes
      triggerElement.focus();
    }
  }, [show, modalRef, triggerElement]);

  const handleCompanyChange = (event) => {
    const newSelection = event.target.value;

    if (selectedCompanyIds.includes(newSelection)) {
      setSelectedCompanyIds(selectedCompanyIds.filter((id) => id !== newSelection));
    } else {
      setSelectedCompanyIds([...selectedCompanyIds, newSelection]);
    }
  };

  const handleSave = async () => {
    if (monthsToAdd <= 0) {
      setEndDateError('Vänligen välj ett giltigt slutdatum.');
      return;
    } else {
      setEndDateError('');
    }
    if (selectedCompanyIds.length === 0) {
      setCompanyError('Vänligen välj minst ett företag.');
      return;
    } else {
      setCompanyError('');
    }

    if (selectedCompanyIds.length === 0) {
      setCompanyError('Vänligen välj minst ett företag.');
      return;
    } else {
      setCompanyError('');
    }

    for (const orgId of selectedCompanyIds) {
      console.log('Org ID:', orgId);

      try {
        await newContractor({
          personId: personId,
          ttlMonths: monthsToAdd,
          emailAddress: email,
          orgId: parseInt(orgId, 10),
          restrictedMobile: phone,
        });
        snackbar({
          message: `Användaren skapades för orgId: ${orgId}.`,
          status: 'success',
          position: 'bottom-left',
        });
      } catch (error) {
        console.error(`Error creating contractor for orgId ${orgId}:`, error);
        snackbar({
          message: `Error när användaren skapades för orgId ${orgId}.`,
          status: 'error',
          position: 'bottom-left',
        });
        break;
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

        snackbar({
          message: 'Informationen hämtades.',
          status: 'success',
          position: 'bottom-left',
        });
      } else {
        snackbar({
          message: 'Okänt fel uppstod.',
          status: 'error',
          position: 'bottom-left',
        });
      }
    } catch (error) {
      console.error('Error fetching person details:', error);
      snackbar({
        message: 'Error när persond detaljerna skulle hämtas. Vänligen försök igen.',
        status: 'error',
        position: 'bottom-left',
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

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      onClose();
    }
    if (event.key === 'Tab') {
      const focusableModalElements = modalRef.current.querySelectorAll(
        'a[href], button:not([disabled]), textarea, input, select'
      );
      const firstElement = focusableModalElements[0];
      const lastElement = focusableModalElements[focusableModalElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        // If shift+tab is pressed on the first focusable element, move to the last
        lastElement.focus();
        event.preventDefault();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        // If tab is pressed on the last focusable element, move to the first
        firstElement.focus();
        event.preventDefault();
      }
    }
  };

  return (
    <Modal
      ref={modalRef}
      tabIndex={-1}
      show={show}
      role="dialog"
      label="Ny användare"
      onClose={onClose}
      onKeyDown={handleKeyDown}
      className="w-full md:w-[52rem]"
      aria-labelledby="newUserModalLabel"
    >
      <div className="flex flex-col gap-7">
        <h3 id="newUserModalLabel" className="sr-only text-xl">
          Ny användare
        </h3>

        <FormLabel htmlFor="SSNInput" className="flex justify-between items-center">
          <span className="flex items-center">
            Personnummer
            <abbr className="no-underline text-red-600 ml-1" title="Obligatoriskt fält">
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
            aria-required="true"
            autoComplete="off"
          />
        </FormLabel>

        <div className="flex justify-end ">
          <Button
            loading={isLoading}
            color="vattjom"
            onClick={handleGetInfo}
            disabled={!isSSNValid || infoButtonClicked}
            aria-label="Hämta användar information"
          >
            Hämta information
          </Button>
        </div>

        <FormLabel htmlFor="firstNameInput" className="flex justify-between">
          <span className={`flex items-center ${!lastName ? 'text-gray-600' : ''}`}>Förnamn</span>

          <div className="w-4/6 flex flex-col">
            <Input
              value={firstName}
              readOnly
              disabled
              className="!text-gray-600"
              id="firstNameInput"
              autoComplete="given-name"
            />
          </div>
        </FormLabel>

        <FormLabel className="flex justify-between items-center" htmlFor="lastNameInput">
          Efternamn
          <div className="w-4/6 flex flex-col">
            <Input
              value={lastName}
              readOnly
              disabled
              id="lastNameInput"
              name="lastName"
              className="!text-gray-600"
              autoComplete="family-name"
            />
          </div>
        </FormLabel>

        <Divider />

        <FormLabel className="flex justify-between items-center" htmlFor="nickNameInput">
          Tilltalsnamn
          <Input
            className="w-4/6"
            type="text"
            value={nickName}
            onChange={(e) => setNickName(e.target.value)}
            id="nickNameInput"
            autoComplete="nickname"
          />
        </FormLabel>

        <span className="font-normal text-sm">Tilltalsnamn används då användarnamnet genereras.</span>

        <FormLabel className="flex justify-between" htmlFor="emailInput">
          <div className="flex items-center">
            E-post
            <abbr className="text-red-600 ml-1 no-underline" title="Obligatoriskt fält">
              *
            </abbr>
          </div>
          <ValidatedInput
            type="email"
            value={email}
            error={emailError}
            onChange={handleEmailChange}
            id="emailInput"
            required
            autocomplete="email"
          />
        </FormLabel>

        <FormLabel className="flex justify-between" htmlFor="phoneInput">
          <div className="flex items-center">
            Telefonnummer
            <abbr className="text-red-600 ml-1 no-underline" title="Obligatoriskt fält">
              *
            </abbr>
          </div>
          <ValidatedInput
            type="text"
            value={phone}
            error={phoneError}
            onChange={handlePhoneChange}
            id="phoneInput"
            required
            autocomplete="tel"
          />
        </FormLabel>

        <FormLabel htmlFor="endDateSelect" className="flex items-center justify-between">
          <div className="flex items-center">
            Slutdatum
            <abbr className="text-red-600 ml-1 no-underline" title="Obligatoriskt fält">
              *
            </abbr>
          </div>
          <div className="w-4/6">
            <Select
              id="endDateSelect"
              required
              className="w-full"
              value={monthsToAdd.toString()}
              onChange={(event: React.ChangeEvent<HTMLSelectElement>) => {
                const months = parseInt(event.target.value, 10);
                setMonthsToAdd(months);
                setIsEndDateValid(months > 0);
                setEndDateError(months > 0 ? '' : 'Vänligen välj ett giltigt slutdatum.');
              }}
            >
              <Select.Option value="0">Välj slutdatum</Select.Option>
              <Select.Option value="1">Om 1 månad till</Select.Option>
              <Select.Option value="2">Om 2 månader till</Select.Option>
              <Select.Option value="3">Om 3 månader till</Select.Option>
            </Select>

            {endDateError && <span className="text-red-600 mt-1 text-xs">{endDateError}</span>}
          </div>
        </FormLabel>

        {companyList.length > 1 && (
          <FormLabel className="flex justify-between items-center" htmlFor="companySelection">
            <div className="flex items-center">
              Företag
              <abbr className="text-red-600 ml-1 no-underline" title="Obligatoriskt fält">
                *
              </abbr>
            </div>

            <div className="w-4/6">
              <Combobox
                className="w-full"
                multiple
                value={selectedCompanyIds}
                onChange={handleCompanyChange}
                placeholder="Välj företag"
                id="companySelection"
                aria-required="true"
              >
                <Combobox.List>
                  {companyList?.map((company) => (
                    <Combobox.Option key={company.orgId} value={company.orgId.toString()}>
                      {company.orgName}
                    </Combobox.Option>
                  ))}
                </Combobox.List>
              </Combobox>

              {companyError && <span className="text-red-600 mt-1 text-xs">{companyError}</span>}
            </div>
          </FormLabel>
        )}

        <div className="flex justify-between w-full gap-10">
          <Button
            variant="secondary"
            className="w-[calc(50%-2.5rem)]"
            onClick={onClose}
            aria-label="Avbryt och stäng modalen"
          >
            Avbryt
          </Button>
          <Button
            color="vattjom"
            className="w-[calc(50%-2.5rem)]"
            onClick={handleSave}
            disabled={
              !isSSNValid ||
              !isPhoneValid ||
              !isEmailValid ||
              !SSN ||
              !phone ||
              !firstName ||
              !lastName ||
              !isEndDateValid ||
              selectedCompanyIds.length === 0
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
