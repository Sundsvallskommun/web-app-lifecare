import ValidatedInput from '@components/validated-input/validated-input.component';
import { EditUserModalProps } from '@interfaces/user';
import { updateContractorDetails } from '@services/contractor.service';
import { Button, Modal, useConfirm, useMessage } from '@sk-web-gui/react';
import { validateEmail, validatePhone } from '@utils/validation';
import { useEffect, useState } from 'react';

const EditUserModal: React.FC<EditUserModalProps> = ({ user, onClose, onSave, show }) => {
  // User info
  const [phone, setPhone] = useState(user.restrictedMobile);
  const [email, setEmail] = useState(user.emailAddress);
  const [monthsToAdd, setMonthsToAdd] = useState(0);
  // Validation errors
  const [phoneError, setPhoneError] = useState('');
  const [emailError, setEmailError] = useState('');

  const message = useMessage();
  const { showConfirmation } = useConfirm();

  useEffect(() => {
    setPhone(user.restrictedMobile);
    setEmail(user.emailAddress);
    setPhoneError('');
    setEmailError('');
    //setMonthsToAdd(1);
  }, [user.restrictedMobile, user.emailAddress]);

  const handleSave = async () => {
    const isValid = checkPhoneValidity(phone);
    if (isValid && onSave && user.contractId) {
      try {
        const result = await updateContractorDetails({
          ttlMonths: monthsToAdd,
          contractId: user.contractId,
          personId: user.personId,
          restrictedMobile: phone,
        });
      } catch (error) {
        console.error('Error updateContractorDetails', error);
      }

      onSave();
      message({
        message: 'Användaren uppdaterades.',
        status: 'success',
        position: 'bottom-right',
      });
    } else {
      console.error('user.contractId is undefined');
    }
  };

  const handleSendPassword = () => {
    message({
      message: 'Lösenord har skickats till användaren via SMS.',
      status: 'success',
      position: 'bottom-right',
    });
  };

  const handleResetPassword = () => {
    const confirmationTitle = 'Vänligen bekräfta ditt val.';
    const confirmationMessage = 'Vill du återställa och skicka ett nytt lösenord via SMS?';
    const confirmLabel = 'Ja, återställ och skicka';
    const dismissLabel = 'Avbryt';

    showConfirmation(confirmationTitle, confirmationMessage, confirmLabel, dismissLabel).then((result) => {
      if (result === true) {
        message({
          message: 'Lösenordet har ändrats och skickats till användaren via SMS.',
          status: 'success',
          position: 'bottom-right',
        });
      }
    });
  };

  const handlePhoneChange = (e) => {
    const phoneValue = e.target.value;
    setPhone(phoneValue);
    checkPhoneValidity(phoneValue);
  };

  const handleEmailChange = (e) => {
    const emailValue = e.target.value;
    setEmail(emailValue);
    checkEmailValidity(emailValue);
  };

  const checkPhoneValidity = (phoneNumber) => {
    if (!validatePhone(phoneNumber)) {
      setPhoneError(
        'Ogiltigt telefonnummer, det måste starta med +46 sen 9 siffror till och ej innehålla: bindestreck eller mellanslag.'
      );
      return false;
    } else {
      setPhoneError('');
      return true;
    }
  };

  const checkEmailValidity = (emailText) => {
    if (!validateEmail(emailText)) {
      setEmailError('Ogiltig e-post');
      return false;
    } else {
      setEmailError('');
      return true;
    }
  };

  return (
    <Modal
      show={show}
      label="Uppdatera användare"
      onClose={onClose}
      className="h-full font-semibold w-3/3 lg:w-2/3 xl:w-2/4 2xl:w-1/3 z-10"
    >
      <div className="flex flex-col gap-8 z-12">
        <label htmlFor="ssnInput" className="flex justify-between items-center">
          Personnummer
          <input
            id="ssnInput"
            className="text-gray-400 h-16 w-4/6 text-base"
            type="text"
            value={user.personId}
            readOnly
            disabled
          />
        </label>

        <label htmlFor="phoneInput" className="flex justify-between items-center">
          <div className="flex items-center">
            Telefonnummer{' '}
            <abbr className="no-underline text-red-500 ml-1" title="Required">
              *
            </abbr>
          </div>
          <ValidatedInput
            id="phoneInput"
            type="text"
            value={phone}
            error={phoneError}
            onChange={handlePhoneChange}
            aria-required="true"
          />
        </label>

        <label htmlFor="emailInput" className="flex justify-between items-center">
          <span className="flex items-center">
            E-post{' '}
            <abbr className="no-underline text-red-500 ml-1" title="Required">
              *
            </abbr>
          </span>
          <ValidatedInput
            id="emailInput"
            type="email"
            value={email}
            error={emailError}
            onChange={handleEmailChange}
            aria-required="true"
          />
        </label>

        <label htmlFor="monthsToAddSelect" className="flex justify-between items-center ">
          Slutdatum
          <select
            id="monthsToAddSelect"
            className="h-16 w-4/6 text-base"
            value={monthsToAdd}
            onChange={(e) => setMonthsToAdd(Number(e.target.value))}
          >
            <option value={0}>-</option>
            <option value={1}>1 månad till</option>
            <option value={2}>2 månader till</option>
            <option value={3}>3 månader till</option>
          </select>
        </label>

        <div className="flex justify-between">
          <Button variant="outline" onClick={handleSendPassword} aria-label="Skicka lösen">
            Skicka lösen
          </Button>
          <Button variant="outline" onClick={handleResetPassword} aria-label="Skicka nytt lösenord">
            Nytt lösen
          </Button>
        </div>

        <span className="font-normal" aria-live="polite">
          Lösenord skickas via SMS till användarens telefon.
        </span>

        <div className="flex  justify-between mt-52">
          <Button variant="outline" onClick={onClose}>
            Avbryt
          </Button>
          <Button color="primary" variant="solid" onClick={handleSave}>
            Spara
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default EditUserModal;
