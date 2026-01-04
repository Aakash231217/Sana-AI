
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    console.log("🌱 Starting seed...");

    // 1. Create a Test Class
    const className = "Class 10-A";
    let demoClass = await prisma.class.findUnique({
        where: { name: className },
    });

    if (!demoClass) {
        console.log(`Creating class: ${className}`);
        demoClass = await prisma.class.create({
            data: {
                name: className,
                section: "A",
            },
        });
    } else {
        console.log(`Class ${className} already exists.`);
    }

    // 2. Create Student Records
    const students = [
        { name: "Aarav Patel", rollNumber: "101" },
        { name: "Diya Sharma", rollNumber: "102" },
        { name: "Ishaan Gupta", rollNumber: "103" },
        { name: "Mira Singh", rollNumber: "104" },
        { name: "Rohan Kumar", rollNumber: "105" },
        { name: "Ananya Reddy", rollNumber: "106" },
        { name: "Vihaan Joshi", rollNumber: "107" },
        { name: "Aditi Shah", rollNumber: "108" },
        { name: "Kabir Malhotra", rollNumber: "109" },
        { name: "Zara Khan", rollNumber: "110" },
    ];

    for (const student of students) {
        const exists = await prisma.studentRecord.findUnique({
            where: {
                classId_rollNumber: {
                    classId: demoClass.id,
                    rollNumber: student.rollNumber,
                },
            },
        });

        if (!exists) {
            await prisma.studentRecord.create({
                data: {
                    name: student.name,
                    rollNumber: student.rollNumber,
                    classId: demoClass.id,
                },
            });
            console.log(`Created student: ${student.name} (${student.rollNumber})`);
        }
    }

    // 3. Seed Personality Test
    console.log("Seeding Personality Test...");

    const testTitle = "100-Question Personality Test for Children";
    const testDesc = "A fun and simple test to learn more about your personality! (Ages 7-14)";

    // Check if test exists
    const existingTest = await prisma.test.findFirst({
        where: { title: testTitle }
    });

    if (existingTest) {
        console.log("Personality Test already exists.");
    } else {
        const test = await prisma.test.create({
            data: {
                title: testTitle,
                description: testDesc,
            }
        });

        const questions = [
            // Section A — Social & Outgoing Nature (Extraversion)
            { section: "Extraversion", text: "I like talking to new people." },
            { section: "Extraversion", text: "I enjoy being with friends." },
            { section: "Extraversion", text: "I feel happy at parties or group activities." },
            { section: "Extraversion", text: "I make friends easily." },
            { section: "Extraversion", text: "I like being the leader in games." },
            { section: "Extraversion", text: "I enjoy telling stories or sharing things out loud." },
            { section: "Extraversion", text: "I like trying new activities with others." },
            { section: "Extraversion", text: "I feel comfortable answering questions in class." },
            { section: "Extraversion", text: "I like being in busy and lively places." },
            { section: "Extraversion", text: "I enjoy starting conversations." },
            { section: "Extraversion", text: "I feel lonely when I am by myself for too long." },
            { section: "Extraversion", text: "I like playing group games more than playing alone." },
            { section: "Extraversion", text: "I talk a lot when I’m excited." },
            { section: "Extraversion", text: "I enjoy meeting new classmates." },
            { section: "Extraversion", text: "I like being active and on the move." },
            { section: "Extraversion", text: "I feel confident around new people." },
            { section: "Extraversion", text: "I like planning playdates or outings." },
            { section: "Extraversion", text: "I enjoy being part of teams." },
            { section: "Extraversion", text: "I feel confident sharing my ideas." },
            { section: "Extraversion", text: "I rarely feel shy in groups." },

            // Section B — Kindness & Getting Along (Agreeableness)
            { section: "Agreeableness", text: "I try to be kind to everyone." },
            { section: "Agreeableness", text: "I feel bad when someone gets hurt." },
            { section: "Agreeableness", text: "I help others without being asked." },
            { section: "Agreeableness", text: "I like when everyone gets along." },
            { section: "Agreeableness", text: "I listen when someone is upset." },
            { section: "Agreeableness", text: "I forgive easily when someone says sorry." },
            { section: "Agreeableness", text: "I try to share things with others." },
            { section: "Agreeableness", text: "I speak politely to everyone." },
            { section: "Agreeableness", text: "I notice when someone is sad." },
            { section: "Agreeableness", text: "I trust people unless they give me a reason not to." },
            { section: "Agreeableness", text: "I try to avoid fighting or arguing." },
            { section: "Agreeableness", text: "I help friends with schoolwork or homework." },
            { section: "Agreeableness", text: "I comfort people when they feel upset." },
            { section: "Agreeableness", text: "I try to solve problems peacefully." },
            { section: "Agreeableness", text: "I don’t like being mean to others." },
            { section: "Agreeableness", text: "I think about how my actions affect people." },
            { section: "Agreeableness", text: "I enjoy working together in a group." },
            { section: "Agreeableness", text: "I respect people even if they’re different from me." },
            { section: "Agreeableness", text: "I think being kind is important." },
            { section: "Agreeableness", text: "I try to make friends feel included." },

            // Section C — Responsibility & Self-Discipline (Conscientiousness)
            { section: "Conscientiousness", text: "I try to finish my homework on time." },
            { section: "Conscientiousness", text: "I keep my things in the right place." },
            { section: "Conscientiousness", text: "I pay attention to small details." },
            { section: "Conscientiousness", text: "I try not to delay tasks." },
            { section: "Conscientiousness", text: "I set goals for what I want to improve." },
            { section: "Conscientiousness", text: "I keep my school bag or room organized." },
            { section: "Conscientiousness", text: "People can count on me to do what I say." },
            { section: "Conscientiousness", text: "I like to follow a routine." },
            { section: "Conscientiousness", text: "I follow instructions carefully." },
            { section: "Conscientiousness", text: "I check my work before giving it to the teacher." },
            { section: "Conscientiousness", text: "I work hard when I start something." },
            { section: "Conscientiousness", text: "I take my responsibilities seriously." },
            { section: "Conscientiousness", text: "I finish chores even if I don’t feel like doing them." },
            { section: "Conscientiousness", text: "I plan what I need to do ahead of time." },
            { section: "Conscientiousness", text: "I stay focused even when the work is difficult." },
            { section: "Conscientiousness", text: "I am careful and avoid unnecessary risks." },
            { section: "Conscientiousness", text: "I try to do things the same good way each time." },
            { section: "Conscientiousness", text: "I try to improve my skills regularly." },
            { section: "Conscientiousness", text: "I finish what I start." },
            { section: "Conscientiousness", text: "I like being prepared for school or activities." },

            // Section D — Emotional Strength & Calmness
            { section: "EmotionalStability", text: "I stay calm when things don’t go my way." },
            { section: "EmotionalStability", text: "I feel better quickly after something bad happens." },
            { section: "EmotionalStability", text: "I don’t get worried easily." },
            { section: "EmotionalStability", text: "I handle pressure in school or sports well." },
            { section: "EmotionalStability", text: "I don’t worry too much about the future." },
            { section: "EmotionalStability", text: "I stay positive even on bad days." },
            { section: "EmotionalStability", text: "I can control my emotions." },
            { section: "EmotionalStability", text: "I don’t get angry easily." },
            { section: "EmotionalStability", text: "I try to stay calm when someone upsets me." },
            { section: "EmotionalStability", text: "I feel strong inside most of the time." },
            { section: "EmotionalStability", text: "I don’t overthink small problems." },
            { section: "EmotionalStability", text: "I sleep fine even if something is bothering me." },
            { section: "EmotionalStability", text: "I control my anger during arguments." },
            { section: "EmotionalStability", text: "I take feedback well." },
            { section: "EmotionalStability", text: "I don’t let emotions control me." },
            { section: "EmotionalStability", text: "I don’t take things too personally." },
            { section: "EmotionalStability", text: "I recover fast after being upset." },
            { section: "EmotionalStability", text: "I don’t feel overwhelmed easily." },
            { section: "EmotionalStability", text: "I try to see the bright side of things." },
            { section: "EmotionalStability", text: "I adapt quickly when plans change." },

            // Section E — Curiosity, Creativity & Openness
            { section: "Openness", text: "I like learning new things." },
            { section: "Openness", text: "I want to know how things work." },
            { section: "Openness", text: "I like trying new foods, games, or hobbies." },
            { section: "Openness", text: "I enjoy drawing, music, stories, or art." },
            { section: "Openness", text: "I like thinking about big ideas." },
            { section: "Openness", text: "I change my mind if I learn something new." },
            { section: "Openness", text: "I use my imagination a lot." },
            { section: "Openness", text: "I like learning about different cultures." },
            { section: "Openness", text: "I think about the world and how things connect." },
            { section: "Openness", text: "I enjoy unusual or creative ideas." },
            { section: "Openness", text: "I adjust quickly in new places." },
            { section: "Openness", text: "I enjoy reading or watching things that teach me something." },
            { section: "Openness", text: "I like solving problems in creative ways." },
            { section: "Openness", text: "I want to keep growing and improving." },
            { section: "Openness", text: "I listen when others give me advice." },
            { section: "Openness", text: "I like variety and trying new things." },
            { section: "Openness", text: "I question rules if they don’t make sense." },
            { section: "Openness", text: "I think deeply about life sometimes." },
            { section: "Openness", text: "I try new ways to express myself creatively." },
            { section: "Openness", text: "I enjoy exploring new places, topics, or activities." },
        ];

        console.log(`Adding ${questions.length} questions...`);

        // Create questions in parallel
        await Promise.all(
            questions.map((q, index) =>
                prisma.question.create({
                    data: {
                        testId: test.id,
                        section: q.section,
                        text: q.text,
                        order: index + 1,
                    }
                })
            )
        );
        console.log("Personality Test Seeded!");
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
