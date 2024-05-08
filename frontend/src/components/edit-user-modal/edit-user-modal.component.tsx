import ValidatedInput from '@components/validated-input/validated-input.component';
import { EditUserModalProps } from '@interfaces/user';
import { resetPasswordAndSendSMS } from '@services/account.service';
import { updateContractorDetails } from '@services/contractor.service';
import { Button, FormLabel, Input, Modal, Select, useConfirm, useSnackbar } from '@sk-web-gui/react';
import { validatePhone } from '@utils/validation';
import { useEffect, useState } from 'react';
import useContractorStore from 'src/store/useContractorStore.store';

const EditUserModal: React.FC<EditUserModalProps> = ({ user, onClose, onSave, show }) => {
  // User info
  const [phone, setPhone] = useState(user.restrictedMobile);
  const [monthsToAdd, setMonthsToAdd] = useState(0);
  // Validation errors
  const [phoneError, setPhoneError] = useState('');

  const fetchContractorData = useContractorStore((s) => s.fetchContractorData);

  const snackbar = useSnackbar();
  const { showConfirmation } = useConfirm();

  useEffect(() => {
    setPhone(user.restrictedMobile);
    setPhoneError('');
  }, [user.restrictedMobile]);

  const handleSave = async () => {
    const isValid = checkPhoneValidity(phone);
    if (isValid && onSave && user.contractId) {
      try {
        await updateContractorDetails({
          ttlMonths: monthsToAdd,
          contractId: user.contractId,
          personId: user.personId,
          restrictedMobile: phone,
        });
        fetchContractorData();
      } catch (error) {
        console.error('Error updateContractorDetails', error);
      }

      onSave();
      snackbar({
        message: 'Användaren uppdaterades.',
        status: 'success',
        position: 'bottom-left',
      });
    } else {
      console.error('user.contractId is undefined');
    }
  };

  // Leaving this if we change mind again and want to use it in future.
  // const handleSendPassword = () => {
  //   message({
  //     message: 'Lösenord har skickats till användaren via SMS.',
  //     status: 'success',
  //     position: 'bottom-left',
  //   });
  // };

  const handleResetPassword = async () => {
    const confirmationTitle = 'Vänligen bekräfta ditt val.';
    const confirmationMessage = 'Vill du återställa och skicka ett nytt lösenord via SMS?';
    const confirmLabel = 'Ja, återställ och skicka';
    const dismissLabel = 'Avbryt';

    const confirmed = await showConfirmation(confirmationTitle, confirmationMessage, confirmLabel, dismissLabel);

    if (confirmed) {
      try {
        // Call the password reset service and pass in the necessary data
        await resetPasswordAndSendSMS({ personId: user.personId });
        // Handle the response from the reset service
        snackbar({
          message: 'Lösenordet har ändrats och skickats till användaren via SMS.',
          status: 'success',
          position: 'bottom-left',
        });
      } catch (error) {
        // Handle any errors that occur during the reset process
        console.error('Error resetting password', error);
        snackbar({
          message: 'Det gick inte att återställa lösenordet.',
          status: 'error',
          position: 'bottom-left',
        });
      }
    }
  };

  const handlePhoneChange = (e) => {
    const phoneValue = e.target.value;
    setPhone(phoneValue);
    checkPhoneValidity(phoneValue);
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

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      onClose();
    }
  };

  return (
    <Modal
      show={show}
      role="dialog"
      label="Uppdatera användare"
      onClose={onClose}
      onKeyDown={handleKeyDown}
      className="w-full md:w-[52rem]"
      aria-labelledby="editUserModalLabel"
    >
      <div className="flex flex-col gap-8 z-12">
        <h3 id="editUserModalLabel" className="sr-only text-xl">
          Uppdatera användare
        </h3>
        <FormLabel htmlFor="ssnInput" className="flex justify-between items-center">
          Personnummer
          <Input
            id="ssnInput"
            className="!text-gray-500 w-4/6"
            type="text"
            value={user.personNumber}
            readOnly
            disabled
            autoComplete="off"
          />
        </FormLabel>

        <FormLabel htmlFor="phoneInput" className="flex justify-between items-center">
          <div className="flex items-center">
            Telefonnummer
            <abbr className="no-underline text-red-600 ml-1" title="Required">
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
            autoComplete="tel"
          />
        </FormLabel>

        <FormLabel htmlFor="emailInput" className="flex justify-between items-center">
          E-post
          <Input
            id="emailInput"
            className="!text-gray-500 w-4/6"
            type="email"
            value={user.emailAddress}
            readOnly
            disabled
            autoComplete="off"
          />
        </FormLabel>

        <FormLabel htmlFor="companyInput" className="flex justify-between items-center">
          Företag
          <Input
            id="companyInput"
            className="!text-gray-500 w-4/6"
            type="text"
            value={user.orgName.toString()}
            readOnly
            disabled
            autoComplete="off"
          />
        </FormLabel>

        <FormLabel htmlFor="monthsToAddSelect" className="flex items-center justify-between">
          Slutdatum
          <div className="w-4/6">
            <Select
              className="w-full"
              id="monthsToAddSelect"
              value={monthsToAdd.toString()}
              onChange={(event: React.ChangeEvent<HTMLSelectElement>) => {
                setMonthsToAdd(parseInt(event.target.value, 10));
              }}
            >
              <Select.Option value="0">{user.retireDate}</Select.Option>
              <Select.Option value="1">Om 1 månad till</Select.Option>
              <Select.Option value="2">Om 2 månader till</Select.Option>
              <Select.Option value="3">Om 3 månader till</Select.Option>
            </Select>
          </div>
        </FormLabel>

        <div className="flex justify-between">
          {/* <Button variant="outline" onClick={handleSendPassword} aria-label="Skicka lösen">
            Skicka lösen
          </Button> */}
          <Button variant="secondary" onClick={handleResetPassword}>
            Skicka nytt lösenord
          </Button>
        </div>

        <span className="font-normal" aria-live="polite">
          Lösenord skickas via SMS till användarens telefon.
        </span>

        <div className="flex justify-between mt-52 w-full gap-10">
          <Button
            aria-label="Avbryt"
            type="button"
            variant="secondary"
            className="w-[calc(50%-2.5rem)]"
            onClick={onClose}
          >
            Avbryt
          </Button>
          <Button aria-label="Spara" color="vattjom" className="w-[calc(50%-2.5rem)]" onClick={handleSave}>
            Spara
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default EditUserModal;
