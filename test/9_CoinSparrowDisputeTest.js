import
{
  increaseTimeTo,
  duration,
}
  from './helpers/increaseTime';
import latestTime from './helpers/latestTime';

const BigNumber = web3.BigNumber;

const Hashids = require('hashids');
const hashids = new Hashids('some salting', 16);

require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

const CoinSparrow = artifacts.require('CoinSparrow');

contract('CoinSparrow', function ([_owner, _hirer, _contractor,
  _newArbitrator, _withdrawAccount, _,
]) {
  let jobNum = 1000000000;
  let _jobId = hashids.encode(jobNum);
  const _value = new web3.BigNumber(web3.toWei(0.2, 'ether'));
  const _fee = _value.mul(0.01);
  const _jobStartWindow = 600;
  const _contractorPercent = 60;
  const MAX_SEND = 3;

  beforeEach(async function () {
    this.startTime = latestTime();
    this.agreedSecondsToComplete = duration.days(1);
    this.coinSparrow = await CoinSparrow.new(new web3.BigNumber(
      web3.toWei(MAX_SEND, 'ether')),
    {
      from: _owner,
    });
    jobNum++;
    //    _jobId = web3.fromAscii(hashids.encode(jobNum));
    _jobId = hashids.encode(jobNum);
    // console.log(_jobId);
  });

  /*
   * Dispute & Arbitration
   */
  describe('Arbitration', function () {

    it('Hirer can request dispute When job started', async function () {
      await this.coinSparrow.createJobEscrow(_jobId,
        _hirer, _contractor, _value, _fee,
        _jobStartWindow, this.agreedSecondsToComplete,
        {
          from: _hirer,
          value: _value,
        });
      await this.coinSparrow.jobStarted(_jobId, _hirer,
        _contractor, _value, _fee,
        {
          from: _contractor,
        });
      await this.coinSparrow.requestDispute(_jobId,
        _hirer, _contractor, _value, _fee,
        {
          from: _hirer,
        })
        .should.be.fulfilled;
    });

    it('Hirer can request dispute When job completed', async function () {
      await this.coinSparrow.createJobEscrow(_jobId,
        _hirer, _contractor, _value, _fee,
        _jobStartWindow, this.agreedSecondsToComplete,
        {
          from: _hirer,
          value: _value,
        });
      await this.coinSparrow.jobStarted(_jobId, _hirer,
        _contractor, _value, _fee,
        {
          from: _contractor,
        });
      await this.coinSparrow.jobCompleted(_jobId, _hirer,
        _contractor, _value, _fee,
        {
          from: _contractor,
        });
      await this.coinSparrow.requestDispute(_jobId,
        _hirer, _contractor, _value, _fee,
        {
          from: _hirer,
        })
        .should.be.fulfilled;
    });

    it(
      'Hirer can request dispute When cancellation requested',
      async function () {
        await this.coinSparrow.createJobEscrow(_jobId,
          _hirer, _contractor, _value, _fee,
          _jobStartWindow, this.agreedSecondsToComplete,
          {
            from: _hirer,
            value: _value,
          });
        await this.coinSparrow.jobStarted(_jobId, _hirer,
          _contractor, _value, _fee,
          {
            from: _contractor,
          });
        await this.coinSparrow.requestMutualJobCancellation(
          _jobId, _hirer, _contractor, _value, _fee,
          {
            from: _contractor,
          });
        await this.coinSparrow.requestDispute(_jobId,
          _hirer, _contractor, _value, _fee,
          {
            from: _hirer,
          })
          .should.be.fulfilled;
      });

    it('Hirer cannot request dispute before job started',
      async function () {
        await this.coinSparrow.createJobEscrow(_jobId,
          _hirer, _contractor, _value, _fee,
          _jobStartWindow, this.agreedSecondsToComplete,
          {
            from: _hirer,
            value: _value,
          });
        await this.coinSparrow.requestDispute(_jobId,
          _hirer, _contractor, _value, _fee,
          {
            from: _hirer,
          })
          .should.be.rejected;
      });

    it('Contractor can request dispute When job started',
      async function () {
        await this.coinSparrow.createJobEscrow(_jobId,
          _hirer, _contractor, _value, _fee,
          _jobStartWindow, this.agreedSecondsToComplete,
          {
            from: _hirer,
            value: _value,
          });
        await this.coinSparrow.jobStarted(_jobId, _hirer,
          _contractor, _value, _fee,
          {
            from: _contractor,
          });
        await this.coinSparrow.requestDispute(_jobId,
          _hirer, _contractor, _value, _fee,
          {
            from: _contractor,
          })
          .should.be.fulfilled;
      });

    it('Contractor can request dispute When job completed',
      async function () {
        await this.coinSparrow.createJobEscrow(_jobId,
          _hirer, _contractor, _value, _fee,
          _jobStartWindow, this.agreedSecondsToComplete,
          {
            from: _hirer,
            value: _value,
          });
        await this.coinSparrow.jobStarted(_jobId, _hirer,
          _contractor, _value, _fee,
          {
            from: _contractor,
          });
        await this.coinSparrow.jobCompleted(_jobId, _hirer,
          _contractor, _value, _fee,
          {
            from: _contractor,
          });
        await this.coinSparrow.requestDispute(_jobId,
          _hirer, _contractor, _value, _fee,
          {
            from: _contractor,
          })
          .should.be.fulfilled;
      });

    it(
      'Contractor can request dispute When hirer cancellation requested',
      async function () {
        await this.coinSparrow.createJobEscrow(_jobId,
          _hirer, _contractor, _value, _fee,
          _jobStartWindow, this.agreedSecondsToComplete,
          {
            from: _hirer,
            value: _value,
          });
        await this.coinSparrow.jobStarted(_jobId, _hirer,
          _contractor, _value, _fee,
          {
            from: _contractor,
          });
        await this.coinSparrow.requestMutualJobCancellation(
          _jobId, _hirer, _contractor, _value, _fee,
          {
            from: _hirer,
          });
        await this.coinSparrow.requestDispute(_jobId,
          _hirer, _contractor, _value, _fee,
          {
            from: _contractor,
          })
          .should.be.fulfilled;
      });

    it('Contractor cannot request dispute before job started',
      async function () {
        await this.coinSparrow.createJobEscrow(_jobId,
          _hirer, _contractor, _value, _fee,
          _jobStartWindow, this.agreedSecondsToComplete,
          {
            from: _hirer,
            value: _value,
          });
        await this.coinSparrow.requestDispute(_jobId,
          _hirer, _contractor, _value, _fee,
          {
            from: _contractor,
          })
          .should.be.rejected;
      });

    it(
      'Arbitration/dispute resolution can occur when job is in dispute',
      async function () {
        await this.coinSparrow.createJobEscrow(_jobId,
          _hirer, _contractor, _value, _fee,
          _jobStartWindow, this.agreedSecondsToComplete,
          {
            from: _hirer,
            value: _value,
          });
        await this.coinSparrow.jobStarted(_jobId, _hirer,
          _contractor, _value, _fee,
          {
            from: _contractor,
          });
        await this.coinSparrow.requestMutualJobCancellation(
          _jobId, _hirer, _contractor, _value, _fee,
          {
            from: _hirer,
          });
        await this.coinSparrow.requestDispute(_jobId,
          _hirer, _contractor, _value, _fee,
          {
            from: _contractor,
          })
          .should.be.fulfilled;

        await this.coinSparrow.resolveDispute(_jobId,
          _hirer, _contractor, _value, _fee,
          _contractorPercent,
          {
            from: _owner,
          })
          .should.be.fulfilled;
      });

    it(
      'Arbitration/dispute resolution cannot occur when job is not in dispute',
      async function () {
        await this.coinSparrow.createJobEscrow(_jobId,
          _hirer, _contractor, _value, _fee,
          _jobStartWindow, this.agreedSecondsToComplete,
          {
            from: _hirer,
            value: _value,
          });

        await this.coinSparrow.resolveDispute(_jobId,
          _hirer, _contractor, _value, _fee,
          _contractorPercent,
          {
            from: _owner,
          })
          .should.be.rejected;

        await this.coinSparrow.jobStarted(_jobId, _hirer,
          _contractor, _value, _fee,
          {
            from: _contractor,
          });

        await this.coinSparrow.resolveDispute(_jobId,
          _hirer, _contractor, _value, _fee,
          _contractorPercent,
          {
            from: _owner,
          })
          .should.be.rejected;

        await this.coinSparrow.jobCompleted(_jobId, _hirer,
          _contractor, _value, _fee,
          {
            from: _contractor,
          });

        await this.coinSparrow.resolveDispute(_jobId,
          _hirer, _contractor, _value, _fee,
          _contractorPercent,
          {
            from: _owner,
          })
          .should.be.rejected;
      });

    it(
      'Addresses not approved as Arbitrators cannot resolve a dispute',
      async function () {
        await this.coinSparrow.createJobEscrow(_jobId,
          _hirer, _contractor, _value, _fee,
          _jobStartWindow, this.agreedSecondsToComplete,
          {
            from: _hirer,
            value: _value,
          });
        await this.coinSparrow.jobStarted(_jobId, _hirer,
          _contractor, _value, _fee,
          {
            from: _contractor,
          });
        await this.coinSparrow.requestMutualJobCancellation(
          _jobId, _hirer, _contractor, _value, _fee,
          {
            from: _hirer,
          });
        await this.coinSparrow.requestDispute(_jobId,
          _hirer, _contractor, _value, _fee,
          {
            from: _contractor,
          })
          .should.be.fulfilled;

        await this.coinSparrow.resolveDispute(_jobId,
          _hirer, _contractor, _value, _fee,
          _contractorPercent,
          {
            from: _newArbitrator,
          })
          .should.be.rejected;
        await this.coinSparrow.resolveDispute(_jobId,
          _hirer, _contractor, _value, _fee,
          _contractorPercent,
          {
            from: _hirer,
          })
          .should.be.rejected;
        await this.coinSparrow.resolveDispute(_jobId,
          _hirer, _contractor, _value, _fee,
          _contractorPercent,
          {
            from: _contractor,
          })
          .should.be.rejected;
        await this.coinSparrow.resolveDispute(_jobId,
          _hirer, _contractor, _value, _fee,
          _contractorPercent,
          {
            from: 0x0,
          })
          .should.be.rejected;
      });

    it('Approved Arbitrators can resolve a dispute', async function () {
      await this.coinSparrow.createJobEscrow(_jobId,
        _hirer, _contractor, _value, _fee,
        _jobStartWindow, this.agreedSecondsToComplete,
        {
          from: _hirer,
          value: _value,
        });
      await this.coinSparrow.jobStarted(_jobId, _hirer,
        _contractor, _value, _fee,
        {
          from: _contractor,
        });
      await this.coinSparrow.requestMutualJobCancellation(
        _jobId, _hirer, _contractor, _value, _fee,
        {
          from: _hirer,
        });
      await this.coinSparrow.requestDispute(_jobId,
        _hirer, _contractor, _value, _fee,
        {
          from: _contractor,
        })
        .should.be.fulfilled;

      await this.coinSparrow.addArbitrator(_newArbitrator,
        {
          from: _owner,
        });
      await this.coinSparrow.resolveDispute(_jobId,
        _hirer, _contractor, _value, _fee,
        _contractorPercent,
        {
          from: _newArbitrator,
        })
        .should.be.fulfilled;
    });

    it(
      'Hirer receives correct refund % from dispute resolution',
      async function () {
        let contractorAmount = _value.minus(_fee)
          .mul(_contractorPercent)
          .div(100);
        const hirerPre = web3.eth.getBalance(_hirer);
        const hirerPreForGasCalc = hirerPre.minus(
          contractorAmount);

        await this.coinSparrow.createJobEscrow(_jobId,
          _hirer, _contractor, _value, _fee,
          _jobStartWindow, this.agreedSecondsToComplete,
          {
            from: _hirer,
            value: _value,
          });
        await this.coinSparrow.jobStarted(_jobId, _hirer,
          _contractor, _value, _fee,
          {
            from: _contractor,
          });
        await this.coinSparrow.requestDispute(_jobId,
          _hirer, _contractor, _value, _fee,
          {
            from: _hirer,
          })
          .should.be.fulfilled;

        await this.coinSparrow.addArbitrator(_newArbitrator,
          {
            from: _owner,
          });
        await this.coinSparrow.resolveDispute(_jobId,
          _hirer, _contractor, _value, _fee,
          _contractorPercent,
          {
            from: _newArbitrator,
          })
          .should.be.fulfilled;

        const hirerPost = web3.eth.getBalance(_hirer);

        const gasCost = hirerPreForGasCalc.minus(hirerPost.minus(
          contractorAmount));

        hirerPre.minus(gasCost)
          .should.be.bignumber.equal(hirerPost);
      });

    it(
      'Contractor receives correct refund % from dispute resolution',
      async function () {
        let hirerAmount = _value.minus(_fee)
          .mul(100 - _contractorPercent)
          .div(100);

        const contractorPre = web3.eth.getBalance(
          _contractor);
        const contractorPreForGasCalc = contractorPre.minus(
          hirerAmount);

        await this.coinSparrow.createJobEscrow(_jobId,
          _hirer, _contractor, _value, _fee,
          _jobStartWindow, this.agreedSecondsToComplete,
          {
            from: _hirer,
            value: _value,
          });
        await this.coinSparrow.jobStarted(_jobId, _hirer,
          _contractor, _value, _fee,
          {
            from: _contractor,
          });
        await this.coinSparrow.requestDispute(_jobId,
          _hirer, _contractor, _value, _fee,
          {
            from: _hirer,
          })
          .should.be.fulfilled;

        await this.coinSparrow.addArbitrator(_newArbitrator,
          {
            from: _owner,
          });
        await this.coinSparrow.resolveDispute(_jobId,
          _hirer, _contractor, _value, _fee,
          _contractorPercent,
          {
            from: _newArbitrator,
          })
          .should.be.fulfilled;

        const contractorPost = web3.eth.getBalance(
          _contractor);

        const gasCost = contractorPreForGasCalc.minus(
          contractorPost.minus(hirerAmount));

        contractorPre.minus(gasCost)
          .should.be.bignumber.equal(contractorPost);
      });

    it(
      'CoinSparrow fees correctly calculated after dispute resolution',
      async function () {
        const feesPre = await this.coinSparrow.howManyFees(
          {
            from: _owner,
          });

        await this.coinSparrow.createJobEscrow(_jobId,
          _hirer, _contractor, _value, _fee,
          _jobStartWindow, this.agreedSecondsToComplete,
          {
            from: _hirer,
            value: _value,
          });
        await this.coinSparrow.jobStarted(_jobId, _hirer,
          _contractor, _value, _fee,
          {
            from: _contractor,
          });
        await this.coinSparrow.requestDispute(_jobId,
          _hirer, _contractor, _value, _fee,
          {
            from: _hirer,
          })
          .should.be.fulfilled;

        await this.coinSparrow.addArbitrator(_newArbitrator,
          {
            from: _owner,
          });
        await this.coinSparrow.resolveDispute(_jobId,
          _hirer, _contractor, _value, _fee,
          _contractorPercent,
          {
            from: _newArbitrator,
          })
          .should.be.fulfilled;

        const feesPost = await this.coinSparrow.howManyFees(
          {
            from: _owner,
          });

        feesPost.minus(feesPre)
          .should.be.bignumber.equal(_fee);
      });
  });
});
