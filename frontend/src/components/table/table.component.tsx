import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import ModeEditOutlinedIcon from '@mui/icons-material/ModeEditOutlined';
import { Button, DataTable, DataTableHeader, Divider, SearchBar, useConfirm, useMessage } from '@sk-web-gui/react';
import { Fragment, useState } from 'react';
import EditUserModal from '@components/edit-user-modal/edit-user-modal.component';
import NewUserModal from '@components/new-user-modal/new-user-modal.component';
import { deleteContractor } from '@services/contractor.service';
import { Contractor, ContractorWithName } from '@interfaces/contractor';

interface TableProps {
  contractorData: {
    data: {
      data: Contractor[];
      message: string;
      status: number;
    };
    status: number;
  };
}

export const Table: React.FunctionComponent<TableProps> = ({ contractorData }) => {
  const [isEditModalOpen, setEditModalOpen] = useState<boolean>(false);
  const [isNewUserModalOpen, setNewUserModalOpen] = useState<boolean>(false);
  const [selectedUser, setSelectedUser] = useState<Contractor | null>(null);
  // TODO
  const [isAdmin, setIsAdmin] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState('');

  const rawData = contractorData?.data?.data || [];
  console.log('rawDatarawDatarawData', rawData);
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
          // Logic to update the local users state to reflect the delete goes here
          console.log('Deleting user:', user);
        }
      }
    });
  };

  const handleEdit = (user: Contractor): void => {
    console.log('Editing user:', user);
    setSelectedUser(user);
    setEditModalOpen(true);
  };

  const maskSSN = (ssn: string): string => {
    return ssn ? `${ssn.substring(0, ssn.length - 5)}-XXXX` : '';
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
    ...(isAdmin ? [{ property: 'orgName', label: 'Företag', isShown: true, isColumnSortable: true }] : []),

    {
      renderColumn: (value, user) => <span>{maskSSN(user.personId)}</span>,
      label: 'Pers. nr',
      isShown: true,
      isColumnSortable: true,
    },
    { property: 'restrictedMobile', label: 'Telefonnummer', isShown: true, isColumnSortable: true },
    { property: 'retireDate', label: 'Slutdatum', isShown: true, isColumnSortable: true },
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
          // Logic to save the new user goes here.
          setNewUserModalOpen(false);
        }}
        isAdmin={isAdmin}
        aria-modal="true"
      />
    </div>
  );
};
