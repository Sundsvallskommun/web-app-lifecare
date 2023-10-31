import DefaultLayout from '@layouts/default-layout/default-layout.component';
import { useUserStore } from '@services/user-service/user-service';
import { Table } from '@components/table/table.component';
import { shallow } from 'zustand/shallow';
import { useEffect, useState } from 'react';
import { getContractorByLoginName, lookUpCitizen } from '@services/contractor.service';

export const Exempelsida: React.FC = () => {
  const user = useUserStore((s) => s.user, shallow);
  const [contractorData, setContractorData] = useState<any>(null);

  console.log(user);

  useEffect(() => {
    if (user && user.username) {
      const fetchContractorData = async () => {
        try {
          const fetchedContractorData = await getContractorByLoginName();
          setContractorData(fetchedContractorData);

          /*const citizen = await lookUpCitizen(user.citizenIdentifier);*/
        } catch (error) {
          console.error('Error fetching contractor data:', error);
        }
      };

      fetchContractorData();
    }
  }, [user]);

  return (
    // TODO byt title
    <DefaultLayout title={`Web app starter - Exempelsida`}>
      <Table contractorData={contractorData} />
    </DefaultLayout>
  );
};

export default Exempelsida;
