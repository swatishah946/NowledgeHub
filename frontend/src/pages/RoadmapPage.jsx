
import Layout from '../components/Shared/Layout';
import PageBackground from '../components/Shared/PageBackground';
import RoadmapBuilder from '../components/Roadmap/RoadmapBuilder';

const RoadmapPage = () => {
    return (
        <Layout>

            <PageBackground>
                <div className="container">
                    <RoadmapBuilder />
                </div>
            </PageBackground>
        </Layout>
    );
};

export default RoadmapPage;
