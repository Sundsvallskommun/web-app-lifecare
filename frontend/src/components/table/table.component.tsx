import EditUserModal from '@components/edit-user-modal/edit-user-modal.component';
import NewUserModal from '@components/new-user-modal/new-user-modal.component';
import { Contractor, ContractorDataFormat, ContractorWithName } from '@interfaces/contractor';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import ModeEditOutlinedIcon from '@mui/icons-material/ModeEditOutlined';
import { deleteContractor } from '@services/contractor.service';
import { useUserStore } from '@services/user-service/user-service';

import {
  Button,
  DataTable,
  DataTableHeader,
  Divider,
  ExclamationIcon,
  Icon,
  SearchBar,
  useConfirm,
  useMessage,
} from '@sk-web-gui/react';
import { extractContractorArray } from '@utils/extractContractorArray';
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

  const user = useUserStore((s) => s.user, shallow);

  const fetchContractorData = useContractorStore((s) => s.fetchContractorData);

  const rawData = extractContractorArray(contractorData || null);
  const isLoading = contractorData === null;

  const message = useMessage();
  const { showConfirmation } = useConfirm();

  const handleDelete = (user: Contractor): void => {
    const confirmationTitle = 'Är du säker på att du vill radera denna användare?';
    const confirmationMessage = 'Vänligen bekräfta ditt val.';
    const confirmLabel = 'Ja, radera';
    const dismissLabel = 'Avbryt';

    showConfirmation(confirmationTitle, confirmationMessage, confirmLabel, dismissLabel).then(async (result) => {
      if (result === true) {
        const response = await deleteContractor(user.contractId);

        if (response.error) {
          message({
            message: response.message,
            status: 'error',
            position: 'bottom-right',
          });
        } else {
          message({
            message: 'Användaren raderad.',
            status: 'success',
            position: 'bottom-right',
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

  const searchableFields = ['name', 'SSN', 'loginname', 'restrictedMobile', 'orgName', 'emailAddress'];

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
    { property: 'name', label: 'Namn', isShown: true, isColumnSortable: true },
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
          {isRetireDateSoonEnding(user.retireDate) && (
            <Icon as={ExclamationIcon} label="exclamationI" className="w-9 h-9 ml-4 text-red-500" />
          )}
        </div>
      ),
      label: 'Slutdatum',
      isShown: true,
      isColumnSortable: true,
    },
    {
      renderColumn: (value, user) => (
        <Fragment>
          <DeleteOutlineOutlinedIcon className="text-2xl cursor-pointer" onClick={() => handleDelete(user)} />
          <ModeEditOutlinedIcon className="ml-8 text-2xl cursor-pointer" onClick={() => handleEdit(user)} />
        </Fragment>
      ),
      isShown: true,
      isColumnSortable: false,
    },
  ];

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div role="main">
      <div className="flex justify-between my-8">
        <SearchBar
          rounded
          placeholder="Sök i listan"
          value={searchQuery}
          onClose={onSearchCloseHandler}
          onChange={onSearchChangeHandler}
          className=" w-1/2"
        />
        <Button color="primary" variant="solid" aria-label="Ny användare" onClick={() => setNewUserModalOpen(true)}>
          Ny användare
        </Button>
      </div>

      <h2>
        Användare <span aria-hidden="true">({rawData.length})</span>
      </h2>
      <Divider aria-hidden="true" />
      <DataTable
        className="users-datatable"
        data={filteredUsers}
        headers={headers}
        pageSize={10}
        pageSizes={[5, 10, 15, 25]}
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
      />
    </div>
  );
};
