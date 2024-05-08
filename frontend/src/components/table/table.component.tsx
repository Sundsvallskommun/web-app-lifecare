import EditUserModal from '@components/edit-user-modal/edit-user-modal.component';
import NewUserModal from '@components/new-user-modal/new-user-modal.component';
import { Contractor, ContractorDataFormat, ContractorWithName } from '@interfaces/contractor';
import { deleteContractor } from '@services/contractor.service';
import { useUserStore } from '@services/user-service/user-service';

import {
  // Avatar,
  Button,
  DataTable,
  DataTableHeader,
  Divider,
  Icon,
  SearchField,
  useConfirm,
  useSnackbar,
} from '@sk-web-gui/react';
import { extractContractorArray } from '@utils/extractContractorArray';
// import { getInitials } from '@utils/get-initials';
import { isRetireDateSoonEnding } from '@utils/is-retire-date';
import { Fragment, useState } from 'react';
import useContractorStore from 'src/store/useContractorStore.store';
import { shallow } from 'zustand/shallow';

interface TableProps {
  contractorData: ContractorDataFormat;
}

export const Table: React.FunctionComponent<TableProps> = ({ contractorData }) => {
  const [isEditModalOpen, setEditModalOpen] = useState<boolean>(false);
  const [isNewUserModalOpen, setNewUserModalOpen] = useState<boolean>(false);
  const [selectedUser, setSelectedUser] = useState<Contractor | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [triggerElement, setTriggerElement] = useState(null);

  const user = useUserStore((s) => s.user, shallow);

  const fetchContractorData = useContractorStore((s) => s.fetchContractorData);

  const rawData = extractContractorArray(contractorData || null);
  const isLoading = contractorData === null;

  const snackbar = useSnackbar();

  const { showConfirmation } = useConfirm();

  const handleDelete = (contractor: Contractor): void => {
    const confirmationTitle = 'Är du säker på att du vill radera denna användare?';
    const confirmationMessage = 'Vänligen bekräfta ditt val.';
    const confirmLabel = 'Ja, radera';
    const dismissLabel = 'Avbryt';

    showConfirmation(confirmationTitle, confirmationMessage, confirmLabel, dismissLabel).then(async (result) => {
      if (result === true) {
        const response = await deleteContractor(contractor.contractId, contractor.personId);

        if (response.error) {
          snackbar({
            message: response.message,
            status: 'error',
            position: 'bottom-left',
          });
        } else {
          snackbar({
            message: 'Användaren raderad.',
            status: 'success',
            position: 'bottom-left',
          });
          fetchContractorData();
        }
      }
    });
  };

  const handleEdit = (user: Contractor): void => {
    setSelectedUser(user);
    setEditModalOpen(true);
  };

  const onSearchChangeHandler = (e: React.BaseSyntheticEvent) => {
    setSearchQuery(e.target.value);
  };

  const onSearchCloseHandler = () => {
    setSearchQuery('');
  };

  const processedUsers: ContractorWithName[] = rawData.map((contractor) => ({
    name: `${contractor.givenname} ${contractor.lastname}`,
    ...contractor,
  }));

  const searchableFields = ['name', 'SSN', 'loginname', 'restrictedMobile', 'orgName', 'emailAddress', 'personNumber'];

  const filteredUsers = processedUsers.filter((user) => {
    return searchableFields.some((field) => {
      const value = user[field];
      if (Array.isArray(value)) {
        // if the field contains an array (like orgName), join them into a string
        return value.join(' ').toLowerCase().includes(searchQuery.toLowerCase());
      }
      return String(value).toLowerCase().includes(searchQuery.toLowerCase());
    });
  });

  const headers: DataTableHeader[] = [
    {
      renderColumn: (
        value: string
        // user
      ) => (
        // <Avatar imageAlt="Avatar" imageUrl="" initials={getInitials(user.name)}>
        <span>{value}</span>
      ),
      property: 'name',
      label: 'Namn',
      isShown: true,
      isColumnSortable: true,
    },
    { property: 'loginname', label: 'Användarnamn', isShown: true, isColumnSortable: true },
    { property: 'emailAddress', label: 'E-post', isShown: true, isColumnSortable: true },

    ...(user.isSuperAdmin
      ? [
          {
            property: 'orgName',
            label: 'Företag',
            isShown: true,
            isColumnSortable: true,
            renderColumn: (value) => {
              const orgNames = value.includes(',') ? value.split(', ') : [value];

              // If value is an array, join it into a string and wrap in a span element
              // If not, just return the value as it is but still wrapped in a span
              return <span>{orgNames.join(', ')}</span>;
            },
          },
        ]
      : []),

    {
      renderColumn: (value, user) => <span>{user.personNumber}</span>,
      label: 'Pers. nr',
      isShown: true,
      isColumnSortable: true,
    },
    { property: 'restrictedMobile', label: 'Telefonnummer', isShown: true, isColumnSortable: true },
    {
      renderColumn: (value, user) => (
        <div className="flex items-center">
          <span>{user.retireDate}</span>
          {isRetireDateSoonEnding(user.retireDate) && <Icon name="alert-circle" color="warning" className="ml-8" />}
        </div>
      ),
      label: 'Slutdatum',
      isShown: true,
      isColumnSortable: true,
    },
    {
      renderColumn: (value, user) => (
        <Fragment>
          <Icon
            name="trash"
            aria-label="Ta bort användare"
            color="error"
            className="cursor-pointer"
            onClick={() => handleDelete(user)}
          />
          <Icon
            name="pencil"
            aria-label="Redigera användare"
            color="vattjom"
            className="ml-8 cursor-pointer"
            onClick={() => handleEdit(user)}
          />
        </Fragment>
      ),
      isShown: true,
      isColumnSortable: false,
    },
  ];

  if (isLoading) {
    return (
      <div aria-live="polite" aria-atomic="true">
        {isLoading ? 'Laddar...' : 'Data laddat'}
      </div>
    );
  }

  const openNewUserModal = (event) => {
    setTriggerElement(event.currentTarget); // Store the element that triggered the modal
    setNewUserModalOpen(true);
  };

  return (
    <div>
      <div className="flex justify-between my-8">
        <label htmlFor="searchInput" className="sr-only">
          Sök i listan
        </label>
        <SearchField
          id="searchInput"
          placeholder="Sök i listan"
          value={searchQuery}
          onClose={onSearchCloseHandler}
          onChange={onSearchChangeHandler}
          className="w-1/2"
          autoComplete="off"
        />
        <Button color="vattjom" onClick={(e) => openNewUserModal(e)}>
          Ny användare
        </Button>
      </div>

      <h2 className="my-16">
        Användare <span>({rawData.length})</span>
      </h2>
      <Divider className="mb-16" aria-hidden="true" />
      <DataTable
        variant="datatable"
        background={true}
        data={filteredUsers}
        headers={headers}
        pageSize={filteredUsers.length > 10 ? 10 : 10}
        aria-label="Användar informations columner"
      />

      {selectedUser && (
        <EditUserModal
          user={selectedUser}
          onClose={() => setEditModalOpen(false)}
          onSave={() => {
            setEditModalOpen(false);
          }}
          show={isEditModalOpen}
          aria-modal="true"
        />
      )}

      <NewUserModal
        show={isNewUserModalOpen}
        onClose={() => setNewUserModalOpen(false)}
        onSave={() => {
          setNewUserModalOpen(false);
        }}
        isAdmin={user.isSuperAdmin}
        aria-modal="true"
        triggerElement={triggerElement}
      />
    </div>
  );
};
