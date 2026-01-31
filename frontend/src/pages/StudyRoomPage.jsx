import Layout from '../components/Shared/Layout';
import StudyRoom from '../components/StudyRoom/StudyRoom';

const StudyRoomPage = () => {
    return (
        <Layout>
            <div className="container">
                <h1>📝 Study Room</h1>
                <p>A place for focused, collaborative study sessions.</p>
                <StudyRoom />
            </div>
        </Layout>
    );
};

export default StudyRoomPage;